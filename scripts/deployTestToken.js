// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');
const getContracts = require('./util/getContracts.js');

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  console.log(
    "Deploying TEST TOKEN contracts with the account:",
    deployer.address
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  let gasLimit = (process.env.HARDHAT_NETWORK == undefined) ? 12450000 : 20000000;

  // Deploy F473 contracts
  const F473TestToken = await ethers.getContractFactory('F473TestToken');
  const f473TestTokenContract = await F473TestToken.deploy(
    "ipfs://QmVmaV8c9UdjHbn9hKv7iz4QyDVHvLSW1ERRzGRh6JM3qt",
    {gasPrice: 8000000000, gasLimit}
  );

  console.log('F473 Test Token deployed to:', f473TestTokenContract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
