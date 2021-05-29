module.exports = () => {
  if (process.env.HARDHAT_NETWORK === undefined) {
    return {
      F473 : '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      F473_TOKENS : '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      F473_REPLAY_TOKENS : '0x5fbdb2315678afecb367f032d93f642f64180aa3'
    };
  } else if (process.env.HARDHAT_NETWORK === 'mumbai') {
    return {
      F473 : '0x9bA4BA983A9582923Af50418B7947a0A0834415c',
      F473_TOKENS : '0x932ECD4A1C0F4EcfADDcbe17491e389e434d7a82',
      F473_REPLAY_TOKENS : '0xF77cb73930b44749E644cBF89eaEC40161903e1f'
    };
  } else if (process.env.HARDHAT_NETWORK === 'matic') {
    return {
      F473 : '0xE77b9b56B3548b8a7Da3D70A2Da81f9F40d81Bb9',
      F473_TOKENS : '0xF983Af9EbFf25F320235e40F355bef5De8fD69d2',
      F473_REPLAY_TOKENS : '0x2dB27c91F06294fb7c9bE0164A480076a72Eb898'
    };
  }
  throw "Unknown network: " + process.env.HARDHAT_NETWORK;
};
