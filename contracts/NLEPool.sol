// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import {SafeERC20, SafeMath} from "./lib/Libraries.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {ILendingPool} from "./interfaces/ILendingPool.sol";
import {IStableDebtToken} from "./interfaces/IStableDebtToken.sol";
import {IProtocolDataProvider} from "./interfaces/IProtocolDataProvider.sol";

/**
 * @dev Interface for the Liquidity to Protocol Credit Delegation Pool
 */
contract NLEPool {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // Aave pool management ! Kovan addresses !
    ILendingPool constant aaveLendingPool =
        ILendingPool(address(0xE0fBa4Fc209b4948668006B2bE61711b7f465bAe));
    IProtocolDataProvider constant aaveDataProvider =
        IProtocolDataProvider(
            address(0x3c73A5E5785cAC854D468F727c606C07488a29D6)
        );
    IERC20 constant dai =
        IERC20(address(0xFf795577d9AC8bD7D90Ee22b6C1703490b6512FD));
    IERC20 constant aDai =
        IERC20(address(0xdCf0aF9e59C002FA3AA091a46196b37530FD48a8));

    // Events
    event Borrow(
        address indexed borrower,
        address indexed delegator,
        uint256 amount
    );
    event Repay(
        address indexed borrower,
        address indexed delegator,
        uint256 amount
    );
    event Delegate(address indexed delegator, uint256 amount);
    event Withdraw(address indexed delegator, uint256 amount);

    // User management
    address[] delegatorsList;
    struct Delegator {
        bool exists;
        uint256 delegated;
        uint256 loaned;
    }
    mapping(address => Delegator) public delegators;

    address[] public borrowersList;
    struct Borrower {
        bool allowed;
        uint256 borrowed;
        mapping(address => Delegator) linkedDelegators;
    }
    mapping(address => Borrower) borrowers;

    // Credit delegations management
    mapping(address => uint256) depositedBalancesPerDepositor;
    mapping(address => uint256) borrowedAmountPerDepositor;
    mapping(address => uint256) borrowedAmountPerBorrower;
    mapping(address => uint256) borrowAmount;
    uint256 constant decimals = 1e18;
    address owner;

    constructor() {
        owner = msg.sender;
        dai.safeApprove(address(aaveLendingPool), 2**256 - 1);
        aDai.safeApprove(address(aaveLendingPool), 2**256 - 1);
    }

    // VIEW METHODS

    /**
     * @dev This function returns the current debt situation of the pool's delegators
     * This data is used to compute the addresses and amounts to use when interacting with the pool
     * TBD: try to optimize array size (find a way to deal with unsized array?)
     **/
    function getDelegations()
        public
        view
        returns (
            address[64] memory,
            uint256[64] memory,
            uint256[64] memory
        )
    {
        uint256[64] memory outDelegations;
        uint256[64] memory outLoans;
        address[64] memory delegatorsAddresses;
        uint256 counter = 0;
        for (uint256 i = 0; i < delegatorsList.length; i++) {
            if (delegators[delegatorsList[i]].exists == true) {
                delegatorsAddresses[counter] = delegatorsList[i];
                outDelegations[counter] = delegators[delegatorsList[i]]
                    .delegated;
                outLoans[counter] = delegators[delegatorsList[i]].loaned;
                counter++;
            }
        }
        //return addresses;
        return (delegatorsAddresses, outDelegations, outLoans);
    }

    // OWNER METHODS

    /**
     * @dev allow an address so that it can borrow from the pool
     **/
    function allow(address protocolAddress) external {
        require(msg.sender == owner, "sender not authorized");

        if (borrowers[protocolAddress].allowed == false) {
            borrowers[protocolAddress].allowed = true;
            borrowersList.push(protocolAddress);
        }
    }

    // DELEGATOR METHODS

    /**
     * @dev Deposits an amount of dai to aave and delegates all its borrowing power to the pool
     **/
    function delegate(uint256 amount) public {
        uint256 daiAmount = amount * decimals;
        dai.transferFrom(msg.sender, address(this), daiAmount);
        aaveLendingPool.deposit(address(dai), daiAmount, msg.sender, 0);
        if (!delegators[msg.sender].exists) {
            delegatorsList.push(msg.sender);
            delegators[msg.sender].exists = true;
        }
        delegators[msg.sender].delegated += daiAmount;
        emit Delegate(msg.sender, daiAmount);
    }

    function getAllowance(address delegator, address delegatee)
        public
        view
        returns (uint256)
    {
        (, address stableDebtTokenAddress, ) =
            aaveDataProvider.getReserveTokensAddresses(address(dai));
        uint256 allowance =
            IStableDebtToken(stableDebtTokenAddress).borrowAllowance(
                delegator,
                delegatee
            );
        return allowance;
    }

    /**
     * @dev Nullifies the pool credit delegation, burns the users adai and returns dai
     **/
    function withdraw(
        address[] calldata delegatorsAddrs,
        uint16[] calldata amounts
    ) public {
        (, address stableDebtTokenAddress, ) =
            aaveDataProvider.getReserveTokensAddresses(address(dai));
        uint256 debtBalance =
            IStableDebtToken(stableDebtTokenAddress).principalBalanceOf(
                msg.sender
            );

        uint256 leftover =
            IStableDebtToken(stableDebtTokenAddress).balanceOf(msg.sender) -
                debtBalance;

        uint256 total = 0;
        for (uint256 i = 0; i < delegatorsAddrs.length; i++) {
            uint256 amountToBorrow = amounts[i] * decimals;
            if (i == delegatorsAddrs.length - 1) amountToBorrow += leftover;

            // borrow from delegators to rebalance debt to
            aaveLendingPool.borrow(
                address(dai),
                amountToBorrow,
                1,
                0,
                delegatorsAddrs[i]
            );

            // update storage for other delegators
            borrowedAmountPerDepositor[delegatorsAddrs[i]] += amountToBorrow;
            delegators[delegatorsAddrs[i]].loaned += amountToBorrow;
            total += amountToBorrow;

            emit Borrow(msg.sender, delegatorsAddrs[i], amounts[i]);
        }

        // repay caller's debt with preceding borrows
        if (debtBalance > 0)
            aaveLendingPool.repay(address(dai), total, 1, msg.sender);

        // update storage for withdrawer
        delegators[msg.sender].delegated = 0;
        delegators[msg.sender].loaned = 0;
        borrowedAmountPerDepositor[msg.sender] = 0;

        // withdraw from aave lending pool
        uint256 adaiBalance = aDai.balanceOf(address(msg.sender));
        aDai.transferFrom(msg.sender, address(this), adaiBalance);
        aaveLendingPool.withdraw(address(dai), adaiBalance, msg.sender);
    }

    // BORROWER METHODS

    /**
     * @dev Uses the pool credit delegation to borrow dai for a whitelisted borrower
     * mints debt tokens for the user
     * the token's rate is aave's stable rate + the pools rate (TBD)
     * borrower has to be whitelisted
     **/
    function borrow(
        address[] calldata delegatorsAddrs,
        uint256[] calldata amounts
    ) external {
        require(borrowers[msg.sender].allowed, "not an allowed borrower");
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < delegatorsAddrs.length; i++) {
            uint256 amountToBorrow = amounts[i] * decimals;
            aaveLendingPool.borrow(
                address(dai),
                amountToBorrow,
                1,
                0,
                delegatorsAddrs[i]
            );
            totalAmount += amounts[i] * decimals;
            borrowers[msg.sender].linkedDelegators[
                delegatorsAddrs[i]
            ] = delegators[delegatorsAddrs[i]];
            delegators[delegatorsAddrs[i]].loaned += amountToBorrow;
            borrowedAmountPerDepositor[delegatorsAddrs[i]] += amountToBorrow;
            emit Borrow(msg.sender, delegatorsAddrs[i], amountToBorrow);
        }

        borrowers[msg.sender].borrowed = totalAmount;
        dai.transfer(msg.sender, totalAmount);
    }

    /**
     * @dev Borrowers burns a part of their debt by sending a corresponding amount of dai
     * borrower has to be whitelisted
     **/
    function repay(
        address[] calldata delegatorsAddrs,
        uint256[] calldata amounts
    ) external {
        require(borrowers[msg.sender].allowed, "not an allowed borrower");
        (, address stableDebtTokenAddress, ) =
            aaveDataProvider.getReserveTokensAddresses(address(dai));
        IStableDebtToken debtToken =
            IStableDebtToken(address(stableDebtTokenAddress));

        uint256 total = 0;
        uint256[64] memory updatedAmounts;

        for (uint256 i = 0; i < delegatorsAddrs.length; i++) {
            if (
                amounts[i] * decimals ==
                borrowedAmountPerDepositor[delegatorsAddrs[i]]
            ) {
                updatedAmounts[i] = debtToken.balanceOf(delegatorsAddrs[i]);
            } else {
                updatedAmounts[i] = amounts[i] * decimals;
            }
            total += updatedAmounts[i];
        }

        dai.transferFrom(msg.sender, address(this), total);
        for (uint256 i = 0; i < delegatorsAddrs.length; i++) {
            aaveLendingPool.repay(
                address(dai),
                updatedAmounts[i],
                1,
                delegatorsAddrs[i]
            );

            // update storage for target delegators
            borrowedAmountPerDepositor[delegatorsAddrs[i]] -=
                amounts[i] *
                decimals;
            delegators[delegatorsAddrs[i]].loaned -= amounts[i] * decimals;

            emit Repay(
                msg.sender,
                delegatorsAddrs[i],
                updatedAmounts[i] * decimals
            );
        }
    }
}
