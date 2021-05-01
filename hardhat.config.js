/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-web3');
require('@nomiclabs/hardhat-waffle');
require("@nomiclabs/hardhat-etherscan");
require('@openzeppelin/hardhat-upgrades');
require("hardhat-gas-reporter");
require('dotenv').config();

module.exports = {
  solidity: '0.8.0',
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      accounts: [`0x${process.env.MAINNET_PRIVATE_KEY}`]
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${process.env.TESTNET_ALCHEMY_KEY}`,
      accounts: [`0x${process.env.TESTNET_PRIVATE_KEY}`]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  },
  mocha: {
    timeout: 75000
  }
};
