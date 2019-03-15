// Import styles for the editor contents, and controls
import './index.css';
import React, {Component} from 'react';
import { EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import draftToHtml from 'draftjs-to-html';
import { Editor } from 'react-draft-wysiwyg';
import '../../../../node_modules/react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import firebase from 'firebase';
import { style } from 'typestyle';

const className = style({
	margin: '5px',
	textAlign: 'center',
	borderRadius: '13px',
	padding: '3px 10px'
})
export default class RichEditorExampleTut extends Component {
	constructor(props) {
		super(props);
		this.state = {
			editorState: EditorState.createEmpty(),
			htmlConverted: ''
		};
	}


	componentDidMount() {
		if(this.props.articleId) {
			database.ref(`/draftjs/${this.props.articleId}`).on("value", snap => {
				const data = snap.val();
				if(data) {
					const rawData = data["rawData"];
					if(!rawData.entityMap) {
						rawData.entityMap = [];
					}
					this.setState({
						editorState: EditorState.createWithContent(convertFromRaw(rawData)),
					});
				}
			});
		}
	}

	onEditorStateChange = (editorState) => {
		this.setState({
		  editorState,
		});
	  };
	  

	updateData = () => {
		console.log("Saving data");
		const data = this.state.editorState.getCurrentContent();
		// let html = stateToHTML(data);
		const rawData = convertToRaw(data);
		database.ref(`/draftjs/${this.props.articleId}`).update({ rawData });
	}

	saveData = () => {
		console.log("Saving data");
		const data = this.state.editorState.getCurrentContent();
		// let html = stateToHTML(data);
		const rawData = convertToRaw(data);
		database.ref("/draftjs").push({ rawData }, () => {
			this.setState({editorState: EditorState.createEmpty()})
		});
	}

	convertToHTML = () => {
		var htmlConverted = draftToHtml(convertToRaw(this.state.editorState.getCurrentContent()));
		this.setState({htmlConverted});
	}

	saveImage = () => {
		return {data: {link: "/imagesrc"}}
	}
	
	render() {
		const { articleId } = this.props;
		const { htmlConverted } = this.state;
		return (
			
				// <EditorAndConsoleContainer editorTitle={"Rich Text Editor"}>
				<div>
					<h3>EDITOR</h3>
					<Editor
						editorState={this.state.editorState}
						onEditorStateChange={this.onEditorStateChange}
						editorStyle={styles.editor}
						wrapperStyle={styles.wrapper}
						toolbar={{
							image: { uploadEnabled: true, 
									uploadCallback: uploadImageCallBack, alt: { present: true, mandatory: true },
								},
						}}
					/>
					<div className={className}>
						<button className={`${className} btn-primary`} onClick={this.convertToHTML}>Convert to HTML</button>
						{
							articleId ? <button className={`${className} btn-success`} onClick={this.updateData}>Save</button> : <button className={`${className} btn-success`} onClick={this.saveData}>Save</button>
						}
						
					</div>
					<hr/>
					<div style={styles.htmlBlock}>
						<h3 style={styles.header}>HTML</h3>
						{
							htmlConverted && <pre>{ htmlConverted }</pre>
						}
					
					</div>
				</div>
					
				
				// </EditorAndConsoleContainer>
				
		);
	}
}

function uploadImageCallBack(file) {
	return new Promise(
	  (resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', 'https://api.imgur.com/3/image');
		xhr.setRequestHeader('Authorization', 'Client-ID 8b86f1b3de9ea0b');
		const data = new FormData();
		data.append('image', file);
		xhr.send(data);
		xhr.addEventListener('load', () => {
		  const response = JSON.parse(xhr.responseText);
		  resolve(response);
		});
		xhr.addEventListener('error', () => {
		  const error = JSON.parse(xhr.responseText);
		  reject(error);
		});
	  }
	);
  }

var config = {
	apiKey: "AIzaSyB2IU95zZl_6FwwedOoBZWm2PZbV4gxVB4",
	authDomain: "abstract-dragon-217405.firebaseapp.com",
	databaseURL: "https://abstract-dragon-217405.firebaseio.com",
	projectId: "abstract-dragon-217405",
	storageBucket: "abstract-dragon-217405.appspot.com",
	messagingSenderId: "516164970951"
};
firebase.initializeApp(config);
const database = firebase.database();
const styles = {
	header: {
		textAlign: 'center',
		fontWeight: 'bold'
	},
	htmlBlock: {
		border: '1px solid black',
		margin: '30px',
		padding: '20px'
	},
	editor: {
		border: '1px solid #F1F1F1',
		padding: '20px'
	},
	wrapper: {
		margin: '30px'
	},
	buttons: {
		textAlign: 'center'
	}
}



