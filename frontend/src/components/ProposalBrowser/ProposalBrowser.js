import React from "react";
import classes from "./ProposalBrowser.module.css";
import ProposalCard from "../ProposalCard/ProposalCard";
import { connect } from "react-redux";

class ProposalBrowser extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      proposals: [],
    };
  }

  search = () => {
    if (this.state.searchTerms !== undefined) {
      let searchTerms = this.state.search.split(" ");
      searchTerms = searchTerms.filter((term) => term !== " ");
    }

    // Query database with search term (stored in state)
  };

  componentDidMount = () => {
    this.setState({
      proposals: this.props.proposals,
    });
    console.log("Proposals: ", this.props.proposals);
  };

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  render() {
    return (
      <div className={classes.ProposalBrowser}>
        <div className={classes.SearchContainer}>
          <input
            type="text"
            placeholder="Search for cool proposals here!"
            name="search"
          />
          <div className={classes.SearchButton} onClick={this.search}>
            Search
          </div>
        </div>
        <div className={classes.Box}>
          <h2>Support Proposals</h2>
          <div className={classes.Proposals}>
            {this.state.proposals.map((proposal) => (
              <ProposalCard key={proposal.proposalId} proposal={proposal} />
            ))}
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  selectedAddress: state.selectedAddress,
  proposals: state.proposals,
});

export default connect(mapStateToProps, null)(ProposalBrowser);
