module.exports = () => {
  if (process.env.HARDHAT_NETWORK === undefined) {
    return {
      F473 : '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      F473_TOKENS : '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      F473_REPLAY_TOKENS : '0x5fbdb2315678afecb367f032d93f642f64180aa3'
    };
  } else if (process.env.HARDHAT_NETWORK === 'mumbai') {
    return {
      F473 : '0x9aee9A73eaed3d5D69652B0A807c7863d938e00D',
      F473_TOKENS : '0x5dD34087bB7Cf948f12f98C69A7b605C9bDeb917',
      F473_REPLAY_TOKENS : '0x29092966a996f52c7A9C74C6ebf5fB25B284Af39'
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
