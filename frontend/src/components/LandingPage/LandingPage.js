import React from "react";
import classes from "./LandingPage.module.css";
import world from "../../assets/world.png";
import community from "../../assets/community.png";
import ethereum from "../../assets/ethereum.png";

const LandingPage = () => {
  return (
    <div className={classes.LandingPage}>
      <h1>WIN-WIN</h1>
      <h1>LENDING</h1>
      <h3>
        No-Loss-Exchange provides a new way for borrowers to borrow and lenders
        to lend creating win-win situation for both parties!
      </h3>
      <div className={classes.Section}>
        <div>
          <h2>Exposure to minimum risk</h2>
          <h3>
            By harnessing the power of AAVE's creadit Delegation, N-L-E enables
            the connection of borrowers and lenders worldwide
          </h3>
        </div>
        <img src={world} />
      </div>
      <div className={classes.Section}>
        <div>
          <h2>Huge opportunity For Small Business</h2>
          <h3>Instant access to liquidity!</h3>
        </div>
        <img src={community} />
      </div>
      <div className={classes.Section}>
        <div>
          <h2>Support Your Community</h2>
          <h3>
            You're supporting your community and making money at the same time!
          </h3>
        </div>
        <img src={ethereum} />
      </div>
    </div>
  );
};

export default LandingPage;
