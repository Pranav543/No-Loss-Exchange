// SPDX-License-Identifier: MIT
pragma solidity^0.7.0;
pragma experimental ABIEncoderV2;

/**
 * @dev Interface for the Liquidity to Protocol Credit Delegation Pool
 */
interface INLEPool {

  ////// Hypotheses
  //// limit to one asset : deposit dai to the pool / borrow dai from the pool
  // easier to integrate with only one asset
  // use only stablecoins to ease liquidation management
  //// be EXTREMELY conservative with borrowing ratios
  // 80% is the maximum debt ratio with dai as a collateral
  // let's set an internal limit to something like 50% to prevent users liquidating themselves
  //// use stable rates all the way (for both aave and the pool)

  ////// Questions
  // Should the debt rebalancing be managed onchain or not?
  // How should we dilute the risk between delegators?
  // Proposition : freeDebt takes an array of {address, amount} as input, to which the user's debt will be swapped
  // Proposition : borrow takes an array of {address, amount} as input, on behalf of who the pool will borrow
  // Proposition : these array are computed off chain in a backend service - less complexity on the smart contract, work is better split
  // Proposition : the goal is to make these input array as short as possible, bc the pool will have to call 

  ////// Subjects to be investigated
  // How to calculate borrower rates 
  // How to manage internal pdai/dai rates
  // How to handle pdai repayment

  ////// HAPPY FLOWS
  // DEPOSITOR DELEGATE : has dai in his account, calls delegate, receives adai and pdai
  // DEPOSITOR WITHDRAW : has adai and pdai, calls withdraw, debt is rebalanced, receives dai
  // BORROWER BORROW : calls borrow, debt is being spread into several delegators, receives dai
  // BORROWER REPAY : calls repay, sends dai, debt is being repayed for several delegators

  ////// data structures
  //// credit delegations management
  // total deposited per depositor
  // total borrowed per depositor
  // total borrowed per borrower
  // total borrowed in pool
  //// fees management
  // total fees accrued
  // pdai/dai rate
  // debt token/dai rate


  // DEPOSITOR METHODS

  /**
   * @dev Returns an array of {address, amount}, address being the delegators, amount being the amount delegated to the pool
   **/
  function getDelegations() external;

  /**
   * @dev Returns an array of {address, amount}, address being the delegators, amount being the amount borrowed by the pool
   **/
  function getUtilizations() external;

  /**
   * @dev Deposits an amount of dai to aave and delegates all its borrowing power to the pool
   * users get back adai and pdai, which represents a right to the pool fees
   **/
  function delegate() external;

  /**
   * @dev Nullifies the pool credit delegation, burns the users adai and pdai and returns dai
   * Only permitted if the user has no current debt
   **/
  function withdraw() external;

  /**
   * @dev Will borrow from a debt free depositor, and repay a depositor's debt
   * Essentially, this nullifies the debt of a depositor so that he can withdraw from the pool
   * It rebalances his debt internally in the pool
   * called by the depositors when he withdraws
   **/
  function rebalanceLoan() external;

  // OWNER METHODS

  /**
   * @dev Whitelist an address so that it can borrow from the pool
   **/
  function whitelistBorrower() external;

  // BORROWER METHODS

  /**
   * @dev Uses the pool credit delegation to borrow dai for a whitelisted borrower
   * mints debt tokens for the user
   * the token's rate is aave's stable rate + the pools rate (TBD)
   * borrower has to be whitelisted
   **/
  function borrow() external;

  /**
   * @dev Borrowers burns a part of their debt by sending a corresponding amount of dai
   * borrower has to be whitelisted
   **/
  function repay() external;
}