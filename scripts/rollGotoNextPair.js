// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');

const CONTRACT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const CONTRACT_ADDRESS_TOKENS = '0x5fbdb2315678afecb367f032d93f642f64180aa3';

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

  const NUM_SOLO = (await tokenContract.NUM_SOLO_CHAR()).toNumber();
  const NUM_PAIR = (await tokenContract.NUM_PAIR_CHAR()).toNumber();

  let level, hasPair;
  do {
    do {
      ethers.provider.send("evm_increaseTime", [60 * 10]);
      await contract.roll();
      console.log("At level", level);
    }
    while ((level = (await contract.getCurrentLevel()).toNumber()) != 4 && level != 5 && level != 6 && level != 7 && level != 8 && level != 9);

    if (level == 4) {
      hasPair = ((await contract.getCurrentCardCharacter(0)).toNumber() > NUM_SOLO) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() > NUM_SOLO) || 
        ((await contract.getCurrentCardCharacter(2)).toNumber() > NUM_SOLO) || 
        ((await contract.getCurrentCardCharacter(3)).toNumber() > NUM_SOLO) || 
        ((await contract.getCurrentCardCharacter(4)).toNumber() > NUM_SOLO) ||
        ((await contract.getCurrentCardCharacter(5)).toNumber() > NUM_SOLO);
    } else if (level == 5) {
      hasPair = ((await contract.getCurrentCardCharacter(0)).toNumber() > NUM_SOLO) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() > NUM_SOLO) || 
        ((await contract.getCurrentCardCharacter(2)).toNumber() > NUM_SOLO) || 
        ((await contract.getCurrentCardCharacter(3)).toNumber() > NUM_SOLO) || 
        ((await contract.getCurrentCardCharacter(4)).toNumber() > NUM_SOLO);
    } else if (level == 6) {
      hasPair = ((await contract.getCurrentCardCharacter(0)).toNumber() > NUM_SOLO) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() > NUM_SOLO) || 
        ((await contract.getCurrentCardCharacter(2)).toNumber() > NUM_SOLO) || 
        ((await contract.getCurrentCardCharacter(3)).toNumber() > NUM_SOLO);
    } else if (level == 7) {
      hasPair = ((await contract.getCurrentCardCharacter(0)).toNumber() > NUM_SOLO) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() > NUM_SOLO) ||
        ((await contract.getCurrentCardCharacter(2)).toNumber() > NUM_SOLO);
    } else if (level == 8) {
      hasPair = ((await contract.getCurrentCardCharacter(0)).toNumber() > NUM_SOLO) || 
        ((await contract.getCurrentCardCharacter(1)).toNumber() > NUM_SOLO);
    } else if (level == 9) {
      hasPair = ((await contract.getCurrentCardCharacter(0)).toNumber() > NUM_SOLO);
    }

    console.log("Has Pair?", hasPair);

  } while (!hasPair);

  console.log("done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
