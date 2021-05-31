module.exports = () => {
  if (process.env.HARDHAT_NETWORK === undefined) {
    return {
      F473 : '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      F473_TOKENS : '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      F473_REPLAY_TOKENS : '0x5fbdb2315678afecb367f032d93f642f64180aa3'
    };
  } else if (process.env.HARDHAT_NETWORK === 'mumbai') {
    return {
      F473 : '0xd0347836277BD12989D70596475865677281B26b',
      F473_TOKENS : '0xc0C686B584bf873381D111b60A6A513A9B89D3BD',
      F473_REPLAY_TOKENS : '0x59942d7F05E7CD7d7ad890B0D8a1791b433a3385',
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
