// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');
const getContracts = require('./util/getContracts.js');


const TIME_SLICE_TIME = 60 * 2;
const NUM_HEARTS_LEVEL_NINE_COUPLE = 347;
const NUM_HEARTS_LEVEL_NINE_OTHER = 10;


async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  console.log(
    "Deploying contracts with the account:",
    deployer.address
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  let gasLimit = (process.env.HARDHAT_NETWORK == undefined) ? 12450000 : 20000000;

  // Deploy F473 Replay contracts
  const F473ReplayToken = await ethers.getContractFactory('F473ReplayToken');
  const f473ReplayTokenContract = await F473ReplayToken.deploy("http://localhost/{url}.json", {gasPrice: 8000000000, gasLimit});
  //console.log(f473ReplayTokenContract);

  // Deploy F473 contracts
  const F473Tokens = await ethers.getContractFactory('F473Tokens');
  const f473TokensContract = await F473Tokens.deploy({gasPrice: 8000000000, gasLimit});
  //console.log(f473TokensContract);

  const F473 = await ethers.getContractFactory('F473');
  const f473Contract = await F473.deploy(
    f473TokensContract.address,
    f473ReplayTokenContract.address,
    TIME_SLICE_TIME,
    NUM_HEARTS_LEVEL_NINE_COUPLE,
    NUM_HEARTS_LEVEL_NINE_OTHER,
    {gasPrice: 8000000000, gasLimit}
  );
  //console.log(f473Contract);

  //await f473TokensContract.setGameAddress(f473Contract.address, {gasLimit});
  //await f473ReplayTokenContract.setGameAddress(f473Contract.address, {gasLimit});

  console.log('F473ReplayToken deployed to:', f473ReplayTokenContract.address);
  console.log('F473Tokens deployed to:', f473TokensContract.address);
  console.log('F473 deployed to:', f473Contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
