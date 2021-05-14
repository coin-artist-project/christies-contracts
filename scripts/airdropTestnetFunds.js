// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');

/** CONFIG **/
const TO_ADDRESSES = [
  '0x9eE5E3Ff06425CF972E77c195F70Ecb18aC23d7f', // rbh
  '0x8978a5536f4388024493E8C62739C697745ac447', // tema
  '0xAe8945F496FAc93fAfeDeE95FD9352af03a375fB', // dr
  '0xD1edDfcc4596CC8bD0bd7495beaB9B979fc50336', // dvd
  '0xD9bBb63A892Ecd5296Db56eb594D927826A416a2', // kc
  '0x148e2ed011a9eaaa200795f62889d68153eeacde', // mdc
];
/** CONFIG **/

async function main() {
  // Check the address of the sender
  const [deployer] = await ethers.getSigners();

  for (let addr of TO_ADDRESSES) {
    let tx = await deployer.sendTransaction({
      to: addr,
      value: '0x4563918244f40000'
    });
    let receipt = await tx.wait();
    console.log(receipt);
  }

  console.log("done.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
