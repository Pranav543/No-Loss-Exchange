import React from "react";
import classes from "./ProposalCard.module.css";
import DAI from "../../assets/DAI.png";
import Flag from "react-country-flag";
import { Link } from "react-router-dom";

const ProposalCard = ({ proposal }) => {
  return (
    <div className={classes.ProposalCard}>
      <div className={classes.Topline}>
        <h3>{proposal.title}</h3>
      </div>
      <div className={classes.CreatorInfo}>
        <img
          src={`https://ipfs.io/ipfs/${proposal.creatorImage[0]}`}
          alt="Creator Profile Image"
        />
        <div className={classes.CreatorName}>
          <span>{proposal.creatorName}</span>
          <Flag countryCode={proposal.creatorCountryCode} svg />
        </div>
      </div>
      <p>{proposal.description}</p>
      <div className={classes.FadeOut} />
      <Link className={classes.SeeMore} to={"proposals/" + proposal.proposalId}>
        See more
      </Link>
    </div>
  );
};

export default ProposalCard;
