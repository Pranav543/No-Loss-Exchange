import React from "react";
import { withRouter } from "react-router-dom";
import {
  CarouselProvider,
  Slider,
  Slide,
  ButtonBack,
  ButtonNext,
  Image,
} from "pure-react-carousel";
import classes from "./ProposalPage.module.css";
import styles from "./Carousel.css";
import { Carousel } from "react-responsive-carousel";

import Loading from "../Loading/Loading";
// import { test1, test2, test3, test4 } from "../../constants/testProposals";
import { connect } from "react-redux";

import DAI from "../../assets/DAI.png";
import ModalContainer from "../hoc/ModalContainer/ModalContainer";
// import Fund from "../Fund/Fund";
import { ethers } from "ethers";
import {
  NLE_POOL_ADDRESS
} from "../../constants/contracts";

// ############## SUBCOMPONENTS ##############

const CarouselDisplay = ({ images }) => {
  return (
    <Carousel autoPlay={true} interval={4400} infiniteLoop={true}>
      <div className={classes.Test}>
        <img src={`https://ipfs.io/ipfs/${images[0]}`} />
      </div>
      <div className={classes.Test}>
        <img src={`https://ipfs.io/ipfs/${images[1]}`} />
      </div>
      <div className={classes.Test}>
        <img src={`https://ipfs.io/ipfs/${images[2]}`} />
      </div>
    </Carousel>
  );
};

class ProposalPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      proposal: null,
      repay_amount: 0,
    };
  }

  componentDidMount = () => {
    this.loadData();
    // this.testDataLoader();
  };

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

  loadData = () => {
    //load proposal data to state with id : this.props.match.params.proposalID
    // then this.setState({loading : false})
    const proposalId = this.props.match.params.proposalId;
    console.log(this.props)
    console.log(proposalId);
    console.log("Proposals: ", this.props.proposals);
    this.props.proposals.forEach((proposal) => {
      console.log("proposal: ", proposal["proposalId"]);
      if (proposal["proposalId"] == proposalId) {
        console.log("proposal: ", proposal["proposalId"]);
        this.setState({
          proposal: proposal,
          loading: false,
        });
      }
    });
    console.log(this.state.proposal);
  };

  onBorrow = async () => {
    const delegations = await this.getDelegations();
    const sorted = delegations
      .map((d) => {
        return {
          address: d.delegatorAddress,
          ratio: Number(d.borrowedAmount) / Number(d.delegatedAmount),
          delegated: Number(d.delegatedAmount / 10 ** 18),
          borrowed: Number(d.borrowedAmount / 10 ** 18),
        };
      })
      .sort((a, b) => {
        return a.ratio - b.ratio;
      });
      let toBorrow = this.state.proposal.loan_amount;
    const delegators = [];
    console.log(JSON.stringify(sorted));
    // increase low ratios
    for (const delegator of sorted) {
      const capacity = delegator.delegated * 0.5 - delegator.borrowed;
      let borrowed = capacity;
      if (toBorrow > 0) {
        // if all amount is not dispatched and the next delegator has no capacity left, return empty array
        if (capacity === 0) {
          throw new Error("All capacity used");
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
    if (toBorrow > 0) {
      console.log("error not enough capacity");
    }
    const addresses = delegators.map((d) => d.address);
    console.log("Addresses: ", addresses)
    const amounts = delegators.map((d) => d.amount);
    console.log("Amounts: ", amounts)
    const res = await this.props.nlePool.borrow(addresses, amounts);
    console.log("Borrowing Done: ", res)
  }

  onSupport = async () => {
    console.log("borrower: ", this.state.proposal.borrower_address);
    const res = await this.props.nlePool.allow(
      this.state.proposal.borrower_address
    );
    console.log("Allow Done: ", res);
  };

  onRepay = async () => {
    const delegations = await this.getDelegations();
    const sorted = delegations
      .map((d) => {
        return {
          address: d.delegatorAddress,
          ratio: Number(d.borrowedAmount) / Number(d.delegatedAmount),
          delegated: Number(d.delegatedAmount / 10 ** 18),
          borrowed: Number(d.borrowedAmount / 10 ** 18),
        };
      })
      .sort((a, b) => {
        return b.ratio - a.ratio;
      });
    let toRepay = this.state.repay_amount;
    const delegators = [];
    // decrease higher ratios
    for (const delegator of sorted) {
      if (toRepay > 0) {
        if (toRepay > delegator.borrowed) {
          delegators.push({
            address: delegator.address,
            amount: delegator.borrowed,
          });
          toRepay = toRepay - delegator.borrowed;
        } else {
          delegators.push({
            address: delegator.address,
            amount: toRepay,
          });
          toRepay = 0;
        }
      }
    }
    // if all delegators have not enough borrowed amount to repay, return empty array
    if (toRepay > 0) {
      throw new Error("Amount to repay too high");
    }
    const del = delegators.filter((de) => de.amount !== 0);
    const addresses = del.map((d) => d.address);
    const amounts = del.map((d) => d.amount);
    console.log("Hey: ", amounts)
    const amount = "100000";
    const amountInWeiBN = ethers.utils.parseUnits(amount, "18");
    const approve = await this.props.aDaiContract.approve(NLE_POOL_ADDRESS, amountInWeiBN)
    console.log("Approved: ", approve)
    const res4 = await this.props.nlePool.repay(addresses, amounts);
    console.log("Repaying Done: ", res4);
  }

  render() {
    const { proposal, loading } = this.state;
    return (
      <div className={classes.ProposalPage}>
        {loading ? (
          <Loading />
        ) : (
          <React.Fragment>
            <h2>{proposal.title}</h2>

            <div className={classes.Main}>
              <div style={{ display: "flex", width: "100%" }}>
                <div style={{ marginRight: "30px", flex: 3 }}>
                  <CarouselDisplay images={proposal.images} />

                  <div className={classes.Description}>
                    <h2>Proposal Information</h2>
                    <p>{proposal.description}</p>
                    <p>{proposal.description}</p>
                    <p>{proposal.description}</p>
                    <p>
                      This should definitely support markup - I'll look into a
                      React text editor component...
                    </p>
                  </div>
                </div>
                <div style={{ flex: 2 }}>
                  <div className={classes.CreatorInfo}>
                    <h4>{proposal.creatorName}</h4>
                    <img
                      src={`https://ipfs.io/ipfs/${proposal.creatorImage[0]}`}
                    />
                    <p>{proposal.creatorBio}</p>
                    {this.props.selectedAddress.toLowerCase() !=
                    this.state.proposal.borrower_address.toLowerCase() ? (
                      <div className={classes.SubmitContainer}>
                        <div
                          className={classes.SubmitButton}
                          onClick={this.onSupport}
                        >
                          Give Support
                        </div>
                      </div>
                    ) : (
                      <div className={classes.Input}>
                        <input
                          type="text"
                          placeholder="amount to repay"
                          value={this.state.repay_amount}
                          onChange={(e) =>
                            this.setState({ repay_amount: e.target.value })
                          }
                        />
                        <div className={classes.SubmitContainer}>
                          <div
                            className={classes.SubmitButton}
                            onClick={this.onRepay}
                          >
                            Repay Loan
                          </div>
                        </div>
                        <div className={classes.SubmitContainer}>
                          <div
                            className={classes.SubmitButton}
                            onClick={this.onBorrow}
                          >
                            Borrow
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  selectedAddress: state.selectedAddress,
  proposals: state.proposals,
  nlePool: state.nlePool,
  aDaiContract: state.aDaiContract,
});

export default connect(mapStateToProps, null)(ProposalPage);
