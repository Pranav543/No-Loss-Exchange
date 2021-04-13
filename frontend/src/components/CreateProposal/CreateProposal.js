import React from "react";
import classes from "./CreateProposal.module.css";
import NoAddress from "../NoAddress/NoAddress";
import * as actionTypes from "../../store/actionTypes";
import { connect } from "react-redux";
import DAI from "../../assets/DAI.png";
import ipfsClient from "ipfs-http-client";
const ipfs = ipfsClient({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
});

class CreateProposal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tags: [],
      imageHashes: [],
      imgBuffers: [],
      profImgBuffer: [],
      profImgHashes: [],
    };
  }

  onChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  onSubmit = async () => {
    // FORMAT DATA CORRECTLY AND UPLOAD TO MONGO
    console.log("Before: ", this.props.proposals);
    await this.uploadImages();

    //Format tags as an array of lowercase strings, removing
    let tags = this.state.tags.split(",");
    //note make this recursive
    tags = tags.map((tag) => {
      if (tag[0] === " ") {
        tag = tag.substring(1);
      }
      if (tag[tag.length - 1] === " ") {
        tag = tag.slice(0, -1);
      }
      return tag.toLowerCase();
    });
    this.setState({ tags });
    let proposals = this.props.proposals;
    console.log("Proposals: ", proposals);
    let proposal = {
      title: this.state.title,
      description: this.state.description,
      images: this.state.imageHashes,
      borrower_address: this.state.address,
      loan_amount: this.state.loan,
      tags: this.state.tags,
      proposalId: this.state.address,
      creatorName: this.state.creatorName,
      creatorImage: this.state.profImgHashes,
      creatorBio: this.state.creatorBio,
    };
    console.log("Proposal: ", proposal);

    proposals.push(proposal);
    console.log("Proposals: ", proposals);
    this.props.allProposals(proposals);
    console.log("After: ", this.props.proposals);
  };

  captureFile = (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    const reader = new window.FileReader();

    reader.readAsArrayBuffer(file);

    reader.onloadend = () => {
      let imgBuffers = this.state.imgBuffers;
      imgBuffers.push(Buffer(reader.result));
      this.setState({ imgBuffers });
    };
  };

  captureProfile = (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    const reader = new window.FileReader();

    reader.readAsArrayBuffer(file);

    reader.onloadend = () => {
      let profImgBuffer = this.state.profImgBuffer;
      profImgBuffer.push(Buffer(reader.result));
      this.setState({ profImgBuffer });
    };
  };

  uploadImages = async () => {
    // Takes all image buffers in state and uploads them to to ipfs, storing the hashes in state.
    let imgHashes = [];
    for (const imgBuffer of this.state.imgBuffers) {
      await ipfs.add(imgBuffer).then((result, error) => {
        if (!error) {
          imgHashes.push(result.path);
        } else {
          console.log(error);
        }
      });
    }
    this.setState({ imageHashes: imgHashes });
    let profImgHashes = [];
    for (const imgBuffer of this.state.profImgBuffer) {
      await ipfs.add(imgBuffer).then((result, error) => {
        if (!error) {
          profImgHashes.push(result.path);
        } else {
          console.log(error);
        }
      });
    }
    this.setState({ profImgHashes: profImgHashes });
  };

  // CHECK THE USER HAS ACCOUNT INFORMATION

  render() {
    return (
      <div className={classes.CreateProposal}>
        {!this.props.selectedAddress ? (
          <NoAddress />
        ) : (
          <React.Fragment>
            <div className={classes.Box}>
              <h2> Create New Proposal </h2>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin
                eu eros est. Aliquam et odio efficitur, sodales mi id, pretium
                nisl. Donec suscipit ultrices ligula, in volutpat est pulvinar
                in. Praesent eu rhoncus felis. Cras odio nibh, faucibus eu
                sapien vel, faucibus placerat felis. Nullam ultrices faucibus
                lobortis. Vestibulum a iaculis diam, et tempor augue. Vestibulum
                fermentum feugiat dui, blandit fringilla risus feugiat a. Cras
                sed nisi accumsan, rutrum risus nec, porttitor velit. Proin
                ultricies ornare dui eget mollis.
              </p>
            </div>
            <div className={classes.Box}>
              <h3>Title</h3>
              <input
                type="text"
                placeholder="Proposal Title"
                name="title"
                onChange={this.onChange}
              />
            </div>
            <div className={classes.Box}>
              <h3>Description</h3>
              <textarea
                placeholder="Proposal Description"
                name="description"
                onChange={this.onChange}
              />
            </div>
            <div className={classes.Box}>
              <h3>Upload Some Images Related To Proposal</h3>
              <div className={classes.ImageUpload}>
                <input
                  type="file"
                  multiple
                  accept=".jpg, .jpeg, .png, .bmp, .gif"
                  onChange={this.captureFile}
                />
                <p>Drag Files here</p>
              </div>
            </div>
            <div className={classes.Box}>
              <h3>Creator Name</h3>
              <input
                type="text"
                placeholder="Your Name"
                name="creatorName"
                onChange={this.onChange}
              />
            </div>
            <div className={classes.Box}>
              <h3>Creator Bio</h3>
              <input
                type="text"
                placeholder="Few Words About Yourself"
                name="creatorBio"
                onChange={this.onChange}
              />
            </div>
            <div className={classes.Box}>
              <h3>Creator Image</h3>
              <div className={classes.ImageUpload}>
                <input
                  type="file"
                  multiple
                  accept=".jpg, .jpeg, .png, .bmp, .gif"
                  onChange={this.captureProfile}
                />
                <p>Drag Files here</p>
              </div>
            </div>
            <div className={classes.Box}>
              <h3>Account Address</h3>
              <input
                type="text"
                placeholder="Your Wallet Address"
                name="address"
                onChange={this.onChange}
              />
            </div>
            <div className={classes.Box}>
              <h3>Loan Amount</h3>
              <input
                type="text"
                placeholder="Loan Amount In DAI"
                name="loan"
                onChange={this.onChange}
              />
            </div>
            <div className={classes.Box}>
              <h3>Add Some Tags</h3>
              <input
                type="text"
                placeholder="Separate your tags with a comma"
                name="tags"
                onChange={this.onChange}
              />
            </div>
            <div className={classes.SubmitContainer}>
              <div className={classes.SubmitButton} onClick={this.onSubmit}>
                Submit
              </div>
            </div>
          </React.Fragment>
        )}
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  selectedAddress: state.selectedAddress,
  proposals: state.proposals,
});

const mapDispatchToProps = (dispatch) => ({
  allProposals: (proposals) =>
    dispatch({ type: actionTypes.allProposals, proposals: proposals }),
});

export default connect(mapStateToProps, mapDispatchToProps)(CreateProposal);
