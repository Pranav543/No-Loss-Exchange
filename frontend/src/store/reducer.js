import * as actionTypes from "./actionTypes";

const initialState = {
  // The user's address and balance
  selectedAddress: undefined,
  proposals: [],
  // The ID about transactions being sent, and any possible error with them
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case actionTypes.connectWallet:
      return {
        ...state,
        selectedAddress: action.selectedAddress,
      };
    case actionTypes.connectProvider:
      return {
        ...state,
        provider: action.provider,
        signer: action.provider.getSigner(),
      };
    case actionTypes.connectDaiContract:
      return {
        ...state,
        daiContract: action.contract,
      };
    case actionTypes.disconnectWallet:
      return {
        ...state,
        selectedAddress: undefined,
      };
    case actionTypes.connectnlePool:
      return {
        ...state,
        nlePool: action.nlePool,
      };
    case actionTypes.connectDataProvider:
      return {
        ...state,
        dataProvider: action.dataProvider,
      };
    case actionTypes.connectAavePool:
      return {
        ...state,
        pool: action.pool,
      };
    case actionTypes.connectDaiStableDebtToken:
      return {
        ...state,
        debtToken: action.debtToken,
      };
    case actionTypes.connectADaiContract:
      return {
        ...state,
        aDaiContract: action.aDaiContract,
      };
    case actionTypes.allProposals:
      return {
        ...state,
        proposals: action.proposals,
      };
    case actionTypes.resetState:
      return initialState;
    case actionTypes.setNetworkID:
      console.log("NETWORK SWITCH DETECTED");
      if (!window.ethereum.networkVersion) {
        return state;
      }
      return {
        ...state,
        networkID: action.id,
      };
    default:
      return state;
  }
};

export default reducer;
