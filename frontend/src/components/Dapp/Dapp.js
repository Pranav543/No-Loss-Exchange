import React from "react";
import classes from "./Dapp.module.css";
import * as ROUTES from "../../constants/routes";
import * as actionTypes from "../../store/actionTypes";
import { connect } from "react-redux";

import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import { ethers } from "ethers";

import Navigation from "../Navigation/Navigation";
import LandingPage from "../LandingPage/LandingPage";
import ProposalBrowser from "../ProposalBrowser/ProposalBrowser";
import CreateProposal from "../CreateProposal/CreateProposal";
import AccountPage from "../AccountPage/AccountPage";
import ProposalPage from "../ProposalPage/ProposalPage";
import { abi as nlePoolAbi } from "../../artifacts/contracts/NLEPool.sol/NLEPool.json";
import { abi as aaveProtocolDataProviderAbi } from "../../artifacts/contracts/interfaces/IProtocolDataProvider.sol/IProtocolDataProvider.json";
import { abi as daiContractAbi } from "../../artifacts/contracts/interfaces/IERC20.sol/IERC20.json";
import { abi as aavePoolAbi } from "../../artifacts/contracts/interfaces/ILendingPool.sol/ILendingPool.json";
import { abi as daiStableDebtTokenAbi } from "../../artifacts/contracts/interfaces/IStableDebtToken.sol/IStableDebtToken.json";
import {
  AAVE_POOL_ADDRESS,
  AAVE_PROTOCOL_DATA_PROVIDER_ADDRESS,
  A_DAI_CONTRACT_ADDRESS,
  DAI_CONTRACT_ADDRESS,
  DAI_STABLE_DEBT_TOKEN_CONTRACT_ADDRESS,
  NLE_POOL_ADDRESS,
} from "../../constants/contracts";

const HARDHAT_NETWORK_ID = "31337";
const KOVAN_NETWORK_ID = "42";

class Dapp extends React.Component {
  constructor(props) {
    super(props);
    this.initialState = {
      selectedAddress: undefined,
    };

    this.state = this.initialState;
  }

  render() {
    return (
      <React.Fragment>
        <div className={classes.Dapp}>
          <Navigation
            selectedAddress={this.state.selectedAddress}
            connectWallet={this._connectWallet}
          />
          <div className={classes.Layout}>
            <div className={classes.Main}>
              <Switch>
                <Route exact path={ROUTES.LANDING} component={LandingPage} />
                <Route
                  exact
                  path={ROUTES.PROPOSALS}
                  component={ProposalBrowser}
                />
                <Route path={ROUTES.PROPOSAL} component={ProposalPage} />
                <Route
                  path={ROUTES.CREATE}
                  render={() => (
                    <CreateProposal
                      selectedAddress={this.state.selectedAddress}
                    />
                  )}
                />
                <Route
                  path={ROUTES.ACCOUNT}
                  render={() => (
                    <AccountPage selectedAddress={this.state.selectedAddress} />
                  )}
                />
              </Switch>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }

  _connectWallet = async () => {
    // This method is run when the user clicks the Connect. It connects the
    // dapp to the user's wallet, and initializes it.

    // To connect to the user's wallet, we have to run this method.
    // It returns a promise that will resolve to the user's address.
    const [selectedAddress] = await window.ethereum.enable();
    // Once we have the address, we can initialize the application.

    // First we check the network
    if (!this._checkNetwork()) {
      return;
    }

    this._initialize(selectedAddress);

    // We reinitialize it whenever the user changes their account.
    window.ethereum.on("accountsChanged", ([newAddress]) => {
      // `accountsChanged` event can be triggered with an undefined newAddress.
      // This happens when the user removes the Dapp from the "Connected
      // list of sites allowed access to your addresses" (Metamask > Settings > Connections)
      // To avoid errors, we reset the dapp state
      if (newAddress === undefined) {
        this.props.disconnectWallet();
        return;
      }

      this._initialize(newAddress);
    });

    // We reset the dapp state if the network is changed
    window.ethereum.on("networkChanged", ([networkId]) => {
      this.props.resetState();
      this.props.setNetworkID(networkId);
    });
  };

  _initialize(userAddress) {
    this.props.connectWallet(userAddress);

    // FETCH USER INFORMATION HERE

    this._intializeEthers();
  }

  async _intializeEthers() {
    // We first initialize ethers by creating a provider using window.ethereum

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    this.props.connectProvider(provider);
    const signer = provider.getSigner();
    let nlePool = new ethers.Contract(NLE_POOL_ADDRESS, nlePoolAbi, provider);
    nlePool = nlePool.connect(signer);
    this.props.connectnlePool(nlePool);
    let daiContract = new ethers.Contract(
      DAI_CONTRACT_ADDRESS,
      daiContractAbi,
      provider
    );
    daiContract = daiContract.connect(signer);
    this.props.connectDaiContract(daiContract);
    let aaveDataProvider = new ethers.Contract(
      AAVE_PROTOCOL_DATA_PROVIDER_ADDRESS,
      aaveProtocolDataProviderAbi,
      provider
    );
    aaveDataProvider = aaveDataProvider.connect(signer);
    this.props.connectDataProvider(aaveDataProvider);
    let aavePool = new ethers.Contract(
      AAVE_POOL_ADDRESS,
      aavePoolAbi,
      provider
    );
    aavePool = aavePool.connect(signer);
    this.props.connectAavePool(aavePool);
    let daiStableDebtToken = new ethers.Contract(
      DAI_STABLE_DEBT_TOKEN_CONTRACT_ADDRESS,
      daiStableDebtTokenAbi,
      provider
    );
    daiStableDebtToken = daiStableDebtToken.connect(signer);

    this.props.connectDaiStableDebtToken(daiStableDebtToken);
    let aDaiContract = new ethers.Contract(
      A_DAI_CONTRACT_ADDRESS,
      daiContractAbi,
      provider
    );
    aDaiContract = aDaiContract.connect(signer);
    this.props.connectADaiContract(aDaiContract);

    console.log("nlePool ", nlePool);
    console.log("daiContract ", daiContract);
    console.log("aaveDataProvider ", aaveDataProvider);
    console.log("aavePool ", aavePool);
    console.log("daiStableDebtToken ", daiStableDebtToken);

    // INITIALISE CONTRACTS HERE
  }

  // This is an utility method that turns an RPC error into a human readable
  // message.
  _getRpcErrorMessage(error) {
    if (error.data) {
      return error.data.message;
    }

    return error.message;
  }

  // This method checks if Metamask selected network is Localhost:8545 / Kovan Testnet
  _checkNetwork() {
    if (
      [HARDHAT_NETWORK_ID, KOVAN_NETWORK_ID].includes(
        window.ethereum.networkVersion
      )
    ) {
      return true;
    }

    this.setState({
      networkError:
        "Please connect Metamask to Localhost:8545, or Kovan Testnet",
    });

    return false;
  }
}

// Redux connection
const mapStateToProps = null;

const mapDispatchToProps = (dispatch) => ({
  connectProvider: (provider) =>
    dispatch({ type: actionTypes.connectProvider, provider: provider }),
  connectWallet: (selectedAddress) =>
    dispatch({
      type: actionTypes.connectWallet,
      selectedAddress: selectedAddress,
    }),
  connectDaiContract: (contract) =>
    dispatch({ type: actionTypes.connectDaiContract, contract: contract }),
  disconnectWallet: () => dispatch({ type: actionTypes.disconnectWallet }),
  resetState: () => dispatch({ type: actionTypes.resetState }),
  setNetworkID: (networkId) =>
    dispatch({ type: actionTypes.setNetworkID, id: networkId }),
  connectnlePool: (nlePool) =>
    dispatch({ type: actionTypes.connectnlePool, nlePool: nlePool }),
  connectDataProvider: (dataProvider) =>
    dispatch({
      type: actionTypes.connectDataProvider,
      dataProvider: dataProvider,
    }),
  connectAavePool: (pool) =>
    dispatch({ type: actionTypes.connectAavePool, pool: pool }),
  connectDaiStableDebtToken: (debtToken) =>
    dispatch({
      type: actionTypes.connectDaiStableDebtToken,
      debtToken: debtToken,
    }),
  connectADaiContract: (aDaiContract) =>
    dispatch({
      type: actionTypes.connectADaiContract,
      aDaiContract: aDaiContract,
    }),
});

export default connect(mapStateToProps, mapDispatchToProps)(Dapp);
