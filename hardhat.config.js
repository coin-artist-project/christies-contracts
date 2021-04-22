/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-web3');
require('@nomiclabs/hardhat-waffle');
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

module.exports = {
  solidity: '0.7.3',
  defaultNetwork: 'localhost',
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
        blockNumber: 12285925,
      },
    },
  },
};
