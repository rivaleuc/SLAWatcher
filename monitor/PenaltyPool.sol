// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PenaltyPool {
    struct Bond {
        address provider;
        address customer;
        uint256 amount;
        string slaKey;
        bool active;
    }

    mapping(uint256 => Bond) public bonds;
    uint256 public nextBondId;
    uint256 public slashPercent = 50;
    address public owner;

    event BondStaked(uint256 bondId, address provider, address customer, uint256 amount);
    event BondSlashed(uint256 bondId, uint256 penalty);
    event BondWithdrawn(uint256 bondId);

    constructor() { owner = msg.sender; }

    function stakeBond(address customer, string calldata slaKey) external payable returns (uint256) {
        require(msg.value > 0, "Must stake > 0");
        uint256 id = nextBondId++;
        bonds[id] = Bond(msg.sender, customer, msg.value, slaKey, true);
        emit BondStaked(id, msg.sender, customer, msg.value);
        return id;
    }

    function slashBond(uint256 bondId) external {
        require(msg.sender == owner, "Only owner");
        Bond storage b = bonds[bondId];
        require(b.active, "Inactive");
        uint256 penalty = (b.amount * slashPercent) / 100;
        b.amount -= penalty;
        b.active = false;
        payable(b.customer).transfer(penalty);
        payable(b.provider).transfer(b.amount);
        emit BondSlashed(bondId, penalty);
    }

    function withdrawBond(uint256 bondId) external {
        Bond storage b = bonds[bondId];
        require(msg.sender == b.provider, "Not provider");
        require(b.active, "Inactive");
        b.active = false;
        payable(b.provider).transfer(b.amount);
        emit BondWithdrawn(bondId);
    }
}
