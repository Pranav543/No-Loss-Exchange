import React from "react";
import { Step, Table } from "semantic-ui-react";
import "semantic-ui-css/semantic.min.css";
import classes from "./AccountPage.module.css";
import NoAddress from "../NoAddress/NoAddress";
import { connect } from "react-redux";
import { ethers } from "ethers";
import { NLE_POOL_ADDRESS } from "../../constants/contracts";

class AccountPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      amount: "",
      asset: "DAI",
      aaveDataProvider: null,
      deposited: 0,
      loaned: 0,
      profit: 0,
      protocolProfit: 0,
      step1: false,
      step2: false,
      step3: false,
      step4: false,
      step5: false,
      withdrawStep: false,
    };
  }

  getDelegations = async () => {
    const delegations = [];
    try {
      const res = await this.props.nlePool.getDelegations();
      const [addresses, delAmount, borAmount] = res;

      const delAddresses = addresses.filter(
        (address) => address !== "0x0000000000000000000000000000000000000000"
      );

      for (let i = 0; i < delAddresses.length; i++) {
        delegations.push({
          delegatorAddress: delAddresses[i],
          delegatedAmount: delAmount[i],
          borrowedAmount: borAmount[i],
        });
      }
    } catch (e) {
      console.log(
        `getDelegations failed while fetching delegations data from pool contract with error ${e}`
      );
    }

    return delegations;
  };

  componentDidMount = async () => {
    const aaveDataProvider = this.props.dataProvider;
    // Load prexisting user data from Mongo to state
    this.setState({ aaveDataProvider: aaveDataProvider }, () => {
      this.updateData();
      setInterval(this.updateData, 1000);
    });
  };

  updateData = async () => {
    const allReserves = await this.props.dataProvider.getAllReservesTokens();
    const supportedAssets = ["DAI"];
    const reserves = allReserves.filter((reserve) =>
      supportedAssets.includes(reserve.symbol)
    );
    reserves.map(async (reserve, index) => {
      const asset = reserve.symbol;
      const reserveAddress = reserve.tokenAddress;

      const delegatorData = await this.props.nlePool.delegators(
        this.props.selectedAddress
      );
      const nleDep = Number(delegatorData.delegated.toString());
      const nleLoan = Number(delegatorData.loaned.toString());

      const userReserveData = await this.props.dataProvider.getUserReserveData(
        reserveAddress,
        this.props.selectedAddress
      );
      const currentATokenBalance = Number(
        userReserveData.currentATokenBalance.toString()
      );
      const currentDebtTokenBalance = Number(
        userReserveData.currentStableDebt.toString()
      );
      const principalDebtTokenBalance = Number(
        userReserveData.principalStableDebt.toString()
      );

      // ### Earnings computation ###

      const aTokenEarnings = currentATokenBalance - nleDep;
      const debtTokenEarnings =
        principalDebtTokenBalance === 0
          ? 0
          : (currentDebtTokenBalance - principalDebtTokenBalance) *
            (nleLoan / principalDebtTokenBalance);

      // ############################
      const roundingNumber = 1e4;
      const formatednleDep = (
        Math.round((Number(nleDep) / 1e18) * roundingNumber) / roundingNumber
      ).toString();
      const formatednleLoan = (
        Math.round((Number(nleLoan) / 1e18) * roundingNumber) / roundingNumber
      ).toString();
      const formatedProtocolEarnings = (aTokenEarnings / 1e18).toFixed(6);
      const formatednleEarnings = (debtTokenEarnings / 1e18).toFixed(6);

      this.setState({
        asset: asset,
        deposited: formatednleDep,
        loaned: formatednleLoan,
        profit: formatedProtocolEarnings,
        protocolProfit: formatednleEarnings,
      });
    });
  };

  onDeposit = async () => {
    const amountInWeiBN = ethers.utils.parseUnits(this.state.amount, "18");
    const res1 = await this.props.daiContract.approve(
      NLE_POOL_ADDRESS,
      amountInWeiBN
    );
    console.log("Approve Response: ", res1);
    this.setState({ step1: true });
    const res2 = await this.props.debtToken.approveDelegation(
      NLE_POOL_ADDRESS,
      amountInWeiBN
    );
    console.log("Approve Delegation: ", res2);
    this.setState({ step2: true });
    const res3 = await this.props.nlePool.delegate(this.state.amount);
    console.log("Deposited: ", res3);
    this.setState({ step3: true });
  };

  onWithdraw = async () => {
    this.setState({
      withdrawStep: true,
    });
    const amount = "100000";
    const amountInWeiBN = ethers.utils.parseUnits(amount, "18");
    const res1 = await this.props.aDaiContract.approve(
      NLE_POOL_ADDRESS,
      amountInWeiBN
    );
    console.log("Approved: ", res1);
    this.setState({ step4: true });
    let delegations = await this.getDelegations();
    const toRebalance = delegations.find(
      (delegation) =>
        delegation.delegatorAddress.toLowerCase() === this.props.selectedAddress
    );

    if (!toRebalance) return [];
    delegations = delegations.filter(
      (d) => d.delegatorAddress !== this.props.selectedAddress
    );
    // sort by asc ratio

    const sorted = delegations
      .map((d) => {
        return {
          address: d.delegatorAddress,
          ratio: Number(d.borrowedAmount) / Number(d.delegatedAmount),
          delegated: Number(d.delegatedAmount) / 10 ** 18,
          borrowed: Number(d.borrowedAmount) / 10 ** 18,
        };
      })
      .sort((a, b) => {
        return a.ratio - b.ratio;
      });

    let toBorrow = Number(toRebalance.borrowedAmount) / 10 ** 18;

    const delegators = [];
    // increase low ratios

    for (const delegator of sorted) {
      const capacity = delegator.delegated * 0.5 - delegator.borrowed;
      let borrowed = capacity;
      if (toBorrow > 0) {
        // if all amount is not dispatched and the next delegator has no capacity left, return empty array
        if (capacity === 0) {
          return [];
        }
        if (toBorrow < capacity) {
          borrowed = toBorrow;
        }
        delegators.push({
          address: delegator.address,
          amount: borrowed,
        });
      }
      toBorrow = toBorrow - borrowed;
    }
    console.log("Delegations; ", delegators);
    // if not enough capacity left, return empty array
    if (toBorrow > 0) {
      delegators = [];
    }
    const delegatorsAddresses = delegators.map((d) => d.address);
    const delegatorsAmounts = delegators.map((d) => d.amount);
    console.log("delegatorsAddresses: ", delegatorsAddresses);
    console.log("delegatorsAmounts: ", delegatorsAmounts);

    const res2 = await this.props.nlePool.withdraw(
      delegatorsAddresses,
      delegatorsAmounts
    );
    console.log("Withdraw Finished: ", res2);
    this.setState({ step5: true });
  };

  render = () => {
    return (
      <div className={classes.AccountPage}>
        {!this.props.selectedAddress ? (
          <NoAddress />
        ) : (
          <React.Fragment>
            <div className={classes.Box}>
              <h2> Deposit to Pool </h2>
              <Step.Group ordered widths={3}>
                <Step completed={this.state.step1}>
                  <Step.Content>
                    <Step.Title>Authorize</Step.Title>
                    <Step.Description>
                      Authorize Pool To Deposit Tokens
                    </Step.Description>
                  </Step.Content>
                </Step>

                <Step completed={this.state.step2}>
                  <Step.Content>
                    <Step.Title>Delegate</Step.Title>
                    <Step.Description>
                      Delegating borrow rights to Exchange
                    </Step.Description>
                  </Step.Content>
                </Step>

                <Step completed={this.state.step3}>
                  <Step.Content>
                    <Step.Title>Deposit</Step.Title>
                    <Step.Description>
                      Depositing Tokens Into Aave
                    </Step.Description>
                  </Step.Content>
                </Step>
              </Step.Group>
              <input
                type="text"
                placeholder="amount of DAI"
                value={this.state.amount}
                onChange={(e) => this.setState({ amount: e.target.value })}
              />
              <div className={classes.SubmitContainer}>
                <div className={classes.SubmitButton} onClick={this.onDeposit}>
                  Deposit
                </div>
              </div>
            </div>
            <div className={classes.Box}>
              <h3>Your Earnings</h3>
              <Table color="violet">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Asset</Table.HeaderCell>
                    <Table.HeaderCell>Deposited</Table.HeaderCell>
                    <Table.HeaderCell>Loaned</Table.HeaderCell>
                    <Table.HeaderCell>Profit</Table.HeaderCell>
                    <Table.HeaderCell>Protocol Profit</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  <Table.Row>
                    <Table.Cell>{this.state.asset}</Table.Cell>
                    <Table.Cell>{this.state.deposited}</Table.Cell>
                    <Table.Cell>{this.state.loaned}</Table.Cell>
                    <Table.Cell>{this.state.profit}</Table.Cell>
                    <Table.Cell>{this.state.protocolProfit}</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table>
              {!this.state.withdrawStep ? (
                <div></div>
              ) : (
                <Step.Group ordered widths={2}>
                  <Step completed={this.state.step4}>
                    <Step.Content>
                      <Step.Title>Approve aDai</Step.Title>
                      <Step.Description>Approve aDai Transfer</Step.Description>
                    </Step.Content>
                  </Step>
                  <Step completed={this.state.step5}>
                    <Step.Content>
                      <Step.Title>Withdraw</Step.Title>
                      <Step.Description>
                        Withdraw Tokens from Exchange
                      </Step.Description>
                    </Step.Content>
                  </Step>{" "}
                </Step.Group>
              )}
              <div className={classes.SubmitContainer}>
                <div className={classes.SubmitButton} onClick={this.onWithdraw}>
                  Withdraw
                </div>
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    );
  };
}

const mapStateToProps = (state) => ({
  selectedAddress: state.selectedAddress,
  daiContract: state.daiContract,
  nlePool: state.nlePool,
  dataProvider: state.dataProvider,
  pool: state.pool,
  debtToken: state.debtToken,
  aDaiContract: state.aDaiContract,
  provider: state.provider,
});

export default connect(mapStateToProps, null)(AccountPage);
