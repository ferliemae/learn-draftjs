import React, { Component } from 'react';
// import Button from '@material-ui/core/Button';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';
import { style } from 'typestyle';
import RichEditorExample from '../Examples/RichEditor';
import database from '../../database';
import 'bootstrap/dist/css/bootstrap.css';
import './index.css';

const className = style({
	margin: '10px'
})
class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			articles: []
		}
	}

	componentDidMount() {
		this.getArticles();
	}

	getArticles = () => {
		const articles = [];
		
		database.ref("/draftjs").on("child_added", snap => {
			articles.push(snap.key);
			this.setState({
				articles: articles
			});
		});
	}

	deleteArticle = (article) => {
		database.ref(`/draftjs/${article}`).remove()
		.then(this.getArticles());
	}

	render() {
		const { articles } = this.state;
		return (
			<Router>
				<div style={styles.wrapper}>
					<h3>ARTICLES</h3>
					<ul>
					{
						articles.map((article) => {
							let route = `/${article}`
							return(
									<li>
										<Link className={className} to={route}>{ article }</Link>
										<button className="btn-danger btn-xs" onClick={() => this.deleteArticle(article)} >Delete</button>
									</li>
									
							)
						})
					}
					<li><Link to="/new">New</Link></li>
					</ul>

					<hr />
					
					{
						articles.map((article) => {
									let route = `/${article}`
									return (<Route path={route} render={() => <RichEditorExample articleId={article}/>} />)
								})
					}
					
					<Route path="/new" render={()=> <RichEditorExample />} />
				</div>
  			</Router>
		);
	}
}

const styles = {
	wrapper: {
		margin: '70px'
	}
}
export default App
