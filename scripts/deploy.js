// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  console.log(
    "Deploying contracts with the account:",
    deployer.address
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy F473 contracts
  const F473Tokens = await ethers.getContractFactory('F473Tokens');
  const f473TokensContract = await F473Tokens.deploy();

  const F473 = await ethers.getContractFactory('F473');
  const f473Contract = await F473.deploy(f473TokensContract.address);

  console.log('F473Tokens deployed to:', f473TokensContract.address);
  console.log('F473 deployed to:', f473Contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
