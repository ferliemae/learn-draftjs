import React, { Component } from 'react';
import { ContentState, Editor, EditorState, RichUtils, Modifier, convertToRaw, AtomicBlockUtils, convertFromRaw, CompositeDecorator } from 'draft-js';
import firebase from 'firebase';
import { stateToHTML } from 'draft-js-export-html';

export default class RichEditorExample extends Component {
	constructor(props) {
		super(props);
		
		const decorator = new CompositeDecorator([
			{
			  strategy: findLinkEntities,
			  component: Link,
			},
		  ]);
		
		this.state = {
			editorState: EditorState.createEmpty(decorator),
			staticEditorState: EditorState.createEmpty(decorator),
			showURLInput: false,
			showLinkInput: false,
			url: '',
			urlType: '',
		
		};
		this.focus = () => this.refs.editor.focus();
		this.onChange = (editorState) => this.setState({editorState});
		this.handleKeyCommand = (command) => this._handleKeyCommand(command);
		this.onTab = (e) => this._onTab(e);
		this.onURLChange = (e) => this.setState({ urlValue: e.target.value });
		this.toggleBlockType = (type) => this._toggleBlockType(type);
		this.toggleInlineStyle = (style) => this._toggleInlineStyle(style);
		this.confirmMedia = this._confirmMedia.bind(this);
		this.addImage = this._addImage.bind(this);
		this.addVideo = this._addVideo.bind(this);
		this.saveData = this._saveData.bind(this);
		this.promptForLink = this._promptForLink.bind(this);
		this.confirmLink = this._confirmLink.bind(this);
	}

	componentDidMount() {

		//load content
		database.ref("/draftjs").on("child_added", snap => {
			const decorator = new CompositeDecorator([
				{
					strategy: findLinkEntities,
					component: Link,
				},
				]);
			const data = snap.val();
			
			this.setState({
				editorState: EditorState.createWithContent(convertFromRaw(data["rawData"]), decorator),
				staticEditorState: EditorState.createWithContent(convertFromRaw(data["rawData"]), decorator)
			});
		});
	}

	_handleKeyCommand(command) {
		const {editorState} = this.state;
		const newState = RichUtils.handleKeyCommand(editorState, command);
		if (newState) {
			this.onChange(newState);
			return true;
		}
		return false;
	}

	_onTab(e) {
		const maxDepth = 4;
		this.onChange(RichUtils.onTab(e, this.state.editorState, maxDepth));
	}

	_toggleBlockType(blockType) {
		this.onChange(RichUtils.toggleBlockType(this.state.editorState, blockType));
	}

	_toggleInlineStyle(inlineStyle) {
		this.onChange(RichUtils.toggleInlineStyle(this.state.editorState, inlineStyle));
	}

	_confirmMedia(e) {
		e.preventDefault();
		const {editorState, urlValue, urlType} = this.state;
		const contentState = editorState.getCurrentContent();
		const selectionState = editorState.getSelection();
		const contentStateWithEntity = contentState.createEntity(urlType, 'IMMUTABLE', { src: urlValue });
		const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
		const contentStateWithLink = Modifier.applyEntity(
			contentStateWithEntity,
			selectionState,
			entityKey
		  );
		const newEditorState = EditorState.set(editorState, { currentContent: contentStateWithLink });
		this.setState({
			editorState: AtomicBlockUtils.insertAtomicBlock(newEditorState, entityKey, ' '),
			showURLInput: false,
			urlValue: ''
		}, () => {
			setTimeout(() => this.focus(), 0);
		});
	}

	_promptForMedia(type) {
		this.setState({
			showURLInput: true,
			urlValue: '',
			urlType: type
		}, () => {
			setTimeout(() => this.refs.url.focus(), 0);
		});
	}

	_addAudio() {
		this._promptForMedia('audio');
	}

	_addImage() {
		this._promptForMedia('image');
	}

	_addVideo() {
		this._promptForMedia('video');
	}

	_saveData() {
		console.log("Saving data");

		const data = this.state.editorState.getCurrentContent();
		const rawData = convertToRaw(data);
		
		database.ref("/draftjs").push({ rawData });
	}

	_confirmLink(e) {
		e.preventDefault();
		const {editorState, urlValue} = this.state;
		const contentState = editorState.getCurrentContent();
		const contentStateWithEntity = contentState.createEntity(
		  'LINK',
		  'MUTABLE',
		  {url: urlValue}
		);
		const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
		const newEditorState = EditorState.set(editorState, { currentContent: contentStateWithEntity });
		this.setState({
		  editorState: RichUtils.toggleLink(
			newEditorState,
			newEditorState.getSelection(),
			entityKey
		  ),
		  showLinkInput: false,
		  urlValue: '',
		}, () => {
		  setTimeout(() => this.refs.editor.focus(), 0);
		});
	  }

	_promptForLink(e) {
		e.preventDefault();
		const { editorState } = this.state;
		const selection = editorState.getSelection();
		
		if (!selection.isCollapsed()) {
		  const contentState = editorState.getCurrentContent();
		  const startKey = editorState.getSelection().getStartKey();
		  const startOffset = editorState.getSelection().getStartOffset();
		  const blockWithLinkAtBeginning = contentState.getBlockForKey(startKey);
		  const linkKey = blockWithLinkAtBeginning.getEntityAt(startOffset);
	
		  let url = '';
		  if (linkKey) {
			const linkInstance = contentState.getEntity(linkKey);
			url = linkInstance.getData().url;
		  }
	
		  this.setState({
			showLinkInput: true,
			urlValue: url,
		  }, () => {
			setTimeout(() => this.refs.link.focus(), 0);
		  });
		}
	  }

	render() {
		const { editorState, staticEditorState } = this.state;

		// If the user changes block type before entering any text, we can
		// either style the placeholder or hide it. Let's just hide it now.
		let className = 'RichEditor-editor';
		var contentState = editorState.getCurrentContent();
		if (!contentState.hasText()) {
			if (contentState.getBlockMap().first().getType() !== 'unstyled') {
				className += ' RichEditor-hidePlaceholder';
			}
		}

		let urlInput;
		if (this.state.showURLInput) {
			urlInput = <div style={styles.urlInputContainer}>
				<input
					onChange={this.onURLChange}
					ref="url" style={styles.urlInput}
					type="text"
					value={this.state.urlValue}
					onKeyDown={this.onURLInputKeyDown}
				/>
				<button className="btn btn-default" onMouseDown={this.confirmMedia}>
					Confirm
				</button>
			</div>;
		}
		return (
			<div>
				<div className="col-lg-6">
					<div className="panel panel-primary editor-wrapper">
						<div className="panel-heading">
							<h2 className="panel-title">{this.props.editorTitle || 'Editor'}</h2>
						</div>
						<div className="panel-body">
							<div className="RichEditor-root">
								<BlockStyleControls
									editorState={editorState}
									onToggle={this.toggleBlockType}
								/>
								<InlineStyleControls
									editorState={editorState}
									onToggle={this.toggleInlineStyle}
								/>
							</div>
							<div style = {styles.root}>
								<div style={styles.buttons}>
									<button
										onClick={this.addImage}
										className="btn btn-default"
										style={{ marginRight: 10 }}
									>
										Add Image
									</button>
									<button
										onMouseDown={this.addVideo}
										className="btn btn-default"
										style={{ marginRight: 10 }}
									>
										Add Video
									</button>
									<button className="btn btn-default" onClick={this.promptForLink}>
										Add Link
									</button>
								</div>
								{ urlInput }

								{ this.state.showLinkInput && 
									<div>
										<input
											onChange={this.onURLChange}
											ref="link" style={styles.urlInput}
											type="text"
											value={this.state.urlValue}
											onKeyDown={this.onURLInputKeyDown}
										/>
										<button className="btn btn-default" onMouseDown={this.confirmLink}>
											Confirm
										</button>
									</div>
								}
							</div>

							<div style = {styles.editor} className={className} onClick={this.focus}>
								<Editor
									blockStyleFn={getBlockStyle}
									blockRendererFn={mediaBlockRenderer}
									customStyleMap={styleMap}
									editorState={editorState}
									handleKeyCommand={this.handleKeyCommand}
									onChange={this.onChange}
									onTab={this.onTab}
									placeholder="Tell a story..."
									ref="editor"
									spellCheck={true}
								/>
							</div>

							<button className="btn btn-default" onClick={this.saveData} >SAVE</button>
						</div>
					</div>
				</div>
			
				<div className="col-lg-6">
					<div className="panel panel-primary console-wrapper">
						<div className="panel-heading">
							<h2 className="panel-title">PREVIEW</h2>
						</div>
						<div className="panel-body">
							<div style = {styles.editor} className={className}>
									<Editor
										readOnly
										blockStyleFn={getBlockStyle}
										blockRendererFn={mediaBlockRenderer}
										customStyleMap={styleMap}
										editorState={staticEditorState}
										spellCheck={true}
									/>
							</div>
						</div>
					</div>
				</div>
			</div>
			
		);
	}
}
// Custom overrides for "code" style.
const styleMap = {
	CODE: {
		backgroundColor: 'rgba(0, 0, 0, 0.05)',
		fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
		fontSize: 16,
		padding: 2
	},
};

function getBlockStyle(block) {
	switch (block.getType()) {
		case 'blockquote':
			return 'RichEditor-blockquote';
		case 'paragraph':
			return 'RichEditor-paragraph'
		default:
			return null;
	}
}

class StyleButton extends React.Component {
	constructor() {
		super();
		this.onToggle = (e) => {
			e.preventDefault();
			this.props.onToggle(this.props.style);
		};
	}
	render() {
		let className = 'RichEditor-styleButton';
		if (this.props.active) {
			className += ' RichEditor-activeButton';
		}
		return (
			<span className={className} onMouseDown={this.onToggle}>
				{this.props.label}
			</span>
		);
	}
}

function findLinkEntities(contentBlock, callback, contentState) {
	contentBlock.findEntityRanges(
	  (character) => {
		const entityKey = character.getEntity();
		return (
		  entityKey !== null &&
		  contentState.getEntity(entityKey).getType() === 'LINK'
		);
	  },
	  callback
	);
  }

  const Link = (props) => {
	const {url} = props.contentState.getEntity(props.entityKey).getData();
	return (
	  <a href={url} style={styles.link}>
		{props.children}
	  </a>
	);
  };

const BLOCK_TYPES = [
	{
		label: 'H1',
		style: 'header-one'
	}, {
		label: 'H2',
		style: 'header-two'
	}, {
		label: 'H3',
		style: 'header-three'
	}, {
		label: 'H4',
		style: 'header-four'
	}, {
		label: 'H5',
		style: 'header-five'
	}, {
		label: 'H6',
		style: 'header-six'
	}, {
		label: 'Blockquote',
		style: 'blockquote'
	}, {
		label: 'UL',
		style: 'unordered-list-item'
	}, {
		label: 'OL',
		style: 'ordered-list-item'
	}, {
		label: 'Code Block',
		style: 'code-block'
	}, {
		label: 'PARAGRAPH',
		style: 'paragraph'
	}
];

const BlockStyleControls = (props) => {
	const {editorState} = props;
	const selection = editorState.getSelection();
	const blockType = editorState.getCurrentContent().getBlockForKey(selection.getStartKey()).getType();
	return (
		<div className="RichEditor-controls">
			{BLOCK_TYPES.map(
				(type) => <StyleButton
					key={type.label}
					active={type.style === blockType}
					label={type.label}
					onToggle={props.onToggle}
					style={type.style}
				/>
			)}
		</div>
	);
};

const INLINE_STYLES = [
	{
		label: 'Bold',
		style: 'BOLD'
	}, {
		label: 'Italic',
		style: 'ITALIC'
	}, {
		label: 'Underline',
		style: 'UNDERLINE'
	}, {
		label: 'Monospace',
		style: 'CODE'
	}
];

const InlineStyleControls = (props) => {
	var currentStyle = props.editorState.getCurrentInlineStyle();
	return (
		<div className="RichEditor-controls">
			{INLINE_STYLES.map(
				type => <StyleButton
					key={type.label}
					active={currentStyle.has(type.style)}
					label={type.label}
					onToggle={props.onToggle}
					style={type.style}
				/>
			)}
		</div>
	);
};

const styles = {
	buttons: {
		marginBottom: 10
	},
	urlInputContainer: {
		marginBottom: 10
	},
	urlInput: {
		marginRight: 10,
		padding: 3
	},
	editor: {
		border: '1px solid #ddd',
		cursor: 'text',
		padding: '15px'
	},
	button: {
		marginTop: 10,
		textAlign: 'center'
	},
	link: {
		color: '#3b5998',
		textDecoration: 'underline',
	},
	media: {
		float: 'right'
	}
};

function mediaBlockRenderer(block) {
	if (block.getType() === 'atomic') {
		return { component: Media, editable: false };
	}
	return null;
}

const Audio = (props) => {
	return <audio controls src={props.src} style={styles.media}/>;
};

const Image = (props) => {
	return (
		<div onClick={() => alert("Hello")}>
			<img src={props.src} style={styles.media} alt="Example"/>
		</div>
	);
};

const Video = (props) => {
	return <video controls src={props.src} style={styles.media}/>;
};

const Media = (props) => {
	const entity = props.contentState.getEntity(props.block.getEntityAt(0));
	const {src} = entity.getData();
	const type = entity.getType();
	let media;
	if (type === 'audio') {
		media = <Audio src={src}/>;
	} else if (type === 'image') {
		media = <Image src={src}/>;
	} else if (type === 'video') {
		media = <Video src={src}/>;
	}
	return media;
};
  

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
