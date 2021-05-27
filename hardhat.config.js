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
  solidity: {
    version: '0.8.0',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: 'localhost', // 'hardhat'
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
      //mining: {
      //  auto: false,
      //  interval: 2000
      //}
    },
    mumbai: {
      url: process.env.MUMBAI_ENDPOINT,
      accounts: [`0x${process.env.TESTNET_PRIVATE_KEY}`]
    },
    matic: {
      url: process.env.MATIC_ENDPOINT,
      accounts: [`0x${process.env.MAINNET_PRIVATE_KEY}`]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY
  },
  mocha: {
    timeout: 75000
  }
};
