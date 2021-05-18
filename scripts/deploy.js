// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');

// A puzzle address
//const PUZZLE_PRIZE_ADDRESS = '0x0804C8ae5FDd715969E5719b79B2D6038D25aCE5';
const PUZZLE_PRIZE_ADDRESS = '0x90f79bf6eb2c4f870365e785982e1f101e93b906';


const TIME_SLICE_TIME = 60 * 2;
const NUM_HEARTS_LEVEL_NINE_COUPLE = 100;
const NUM_HEARTS_LEVEL_NINE_OTHER = 10;


async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  console.log(
    "Deploying contracts with the account:",
    deployer.address
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy F473 Replay contracts
  const F473ReplayToken = await ethers.getContractFactory('F473ReplayToken');
  const f473ReplayTokenContract = await F473ReplayToken.deploy("http://localhost/{url}.json");

  // Deploy F473 contracts
  const F473Tokens = await ethers.getContractFactory('F473Tokens');
  const f473TokensContract = await F473Tokens.deploy();

  const F473 = await ethers.getContractFactory('F473');
  const f473Contract = await F473.deploy(
    f473TokensContract.address,
    f473ReplayTokenContract.address,
    PUZZLE_PRIZE_ADDRESS,
    TIME_SLICE_TIME,
    NUM_HEARTS_LEVEL_NINE_COUPLE,
    NUM_HEARTS_LEVEL_NINE_OTHER
  );

  await f473TokensContract.setGameAddress(f473Contract.address);
  await f473ReplayTokenContract.setGameAddress(f473Contract.address);

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
