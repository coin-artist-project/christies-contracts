module.exports = () => {
  if (process.env.HARDHAT_NETWORK === undefined) {
    return {
      F473 : '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      F473_TOKENS : '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      F473_REPLAY_TOKENS : ''
    };
  } else if (process.env.HARDHAT_NETWORK === 'mumbai') {
    return {
      F473 : '0x2aa10123EFfc50af2b9234528cE175F7185b7219',
      F473_TOKENS : '0x2D438F1da6fa4203f8DE40dF5feC2b317f1f9eAd',
      F473_REPLAY_TOKENS : ''
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
