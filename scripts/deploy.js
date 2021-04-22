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

  /*
  // We get the contract to deploy
  const NDS0ShellConverter = await ethers.getContractFactory('NDS0ShellConverter');

  // Deploy NDS0ShellConverter, this will set caller as the Owner
  const ndS0ShellConverter = await NDS0ShellConverter.deploy();
  await ndS0ShellConverter.deployed();
  console.log('NDS0ShellConverter deployed to:', ndS0ShellConverter.address);
  */
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
