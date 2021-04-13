require("@nomiclabs/hardhat-waffle");
/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const API_KEY = "meq8TNCeUaQJ0pnBOlczldo1L3j_iOU1";
const PRIVATE_KEY =
  "5e75adad7a85442fee73273bff7fc23c0a710a8337d539205cb6569b5dc40d34";

module.exports = {
  solidity: "0.7.3",
  networks: {
    kovan: {
      url: `https://eth-kovan.alchemyapi.io/v2/${API_KEY}`,
      accounts: [`0x${PRIVATE_KEY}`],
    },
  },
};
