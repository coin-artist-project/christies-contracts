// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
const CONTRACT_ADDRESS_TOKENS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  // We get the contract to deploy
  const F473 = await ethers.getContractFactory('F473');
  const contract = await F473.attach(CONTRACT_ADDRESS);

  const F473Tokens = await ethers.getContractFactory('F473Tokens');
  const tokenContract = await F473Tokens.attach(CONTRACT_ADDRESS_TOKENS);

  const provider = await ethers.getDefaultProvider();

  if ((await contract.getCurrentLevel()).toNumber() == 12) {
    console.log("Game is over");
    return;
  }

  const DESIRED_CARD = 60;

  let level, hasCard;
  do {
    do {
      ethers.provider.send("evm_increaseTime", [60 * 10]);
      await contract.roll();
      console.log("At level", level);
    }
    while ((level = (await contract.getCurrentLevel()).toNumber()) != 4 && level != 5 && level != 6 && level != 7 && level != 8 && level != 9);

    if (level == 4) {
      hasCard = ((await contract.getCurrentCardCharacter(0)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(2)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(3)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(4)).toNumber() === DESIRED_CARD) ||
        ((await contract.getCurrentCardCharacter(5)).toNumber() === DESIRED_CARD);
    } else if (level == 5) {
      hasCard = ((await contract.getCurrentCardCharacter(0)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(2)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(3)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(4)).toNumber() === DESIRED_CARD);
    } else if (level == 6) {
      hasCard = ((await contract.getCurrentCardCharacter(0)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(2)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(3)).toNumber() === DESIRED_CARD);
    } else if (level == 7) {
      hasCard = ((await contract.getCurrentCardCharacter(0)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() === DESIRED_CARD) ||
        ((await contract.getCurrentCardCharacter(2)).toNumber() === DESIRED_CARD);
    } else if (level == 8) {
      hasCard = ((await contract.getCurrentCardCharacter(0)).toNumber() === DESIRED_CARD) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() === DESIRED_CARD);
    } else if (level == 9) {
      hasCard = ((await contract.getCurrentCardCharacter(0)).toNumber() === DESIRED_CARD);
    }

    console.log("Has Card?", hasCard);

  } while (!hasCard);

  console.log("done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
