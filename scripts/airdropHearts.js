// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');
const getContracts = require('./util/getContracts.js');

/** CONFIG **/
const TO_ADDRESSES = [
  '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x9eE5E3Ff06425CF972E77c195F70Ecb18aC23d7f',
  '0x8978a5536f4388024493E8C62739C697745ac447',
  '0xAe8945F496FAc93fAfeDeE95FD9352af03a375fB',
  '0xD1edDfcc4596CC8bD0bd7495beaB9B979fc50336',
  '0xD9bBb63A892Ecd5296Db56eb594D927826A416a2',
  '0x148e2ed011a9eaaa200795f62889d68153eeacde',
  '0x984f145fe2B6dA0328163A159BD1e422BF5EF48a',
  '0x7c7d093b4Fb96C89fcC29cD4c24c15DB0ed669dF',
  '0x614A61a3b7F2fd8750AcAAD63b2a0CFe8B8524F1',
  '0xbc3b63e1C55Af9CD16eBB1c09504410e8BA7E3df'
];
/** CONFIG **/

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  const CONTRACT_ADDRESS = (getContracts()).F473_TOKENS;

  // We get the contract to deploy
  const F473Tokens = await ethers.getContractFactory('F473Tokens');
  const contract = await F473Tokens.attach(CONTRACT_ADDRESS);

  let gasLimit = (process.env.HARDHAT_NETWORK == undefined) ? 12450000 : 20000000;

  for (let addr of TO_ADDRESSES) {
    await contract.mintHearts(addr, 1, 1, 1000, {gasPrice: 8000000000, gasLimit});
    await contract.mintHearts(addr, 2, 1, 1000, {gasPrice: 8000000000, gasLimit});
    await contract.mintHearts(addr, 3, 1, 1000, {gasPrice: 8000000000, gasLimit});
    await contract.mintHearts(addr, 4, 1, 1000, {gasPrice: 8000000000, gasLimit});
    await contract.mintHearts(addr, 5, 1, 1000, {gasPrice: 8000000000, gasLimit});
    await contract.mintHearts(addr, 6, 1, 1000, {gasPrice: 8000000000, gasLimit});
    await contract.mintHearts(addr, 7, 1, 1000, {gasPrice: 8000000000, gasLimit});
    //let promises = [];
    //for (let index = 1; index <= 7; index++) {
    //  promises.push(contract.mintHearts(addr, index, 1, 2, {gasPrice: 8000000000, gasLimit}));
    //}
    //let res = await Promise.all(promises);
    console.log("Issued to", addr);
  }

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
