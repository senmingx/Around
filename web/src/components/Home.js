import React from 'react';
import $ from 'jquery';
import { Tabs, Spin, Row, Col, Radio } from 'antd';
import { GEO_OPTIONS, POS_KEY, API_ROOT, AUTH_PREFIX, TOKEN_KEY } from "../constants";
import { Gallery } from "./Gallery";
import { CreatePostButton } from "./CreatePostButton";
import { WrappedAroundMap } from "./AroundMap";

const RadioGroup = Radio.Group;

export class Home extends React.Component {
  state = {
    loadingGeoLocation: false,
    loadingPosts: false,
    error: '',
    posts: [],
    topic: 'around'
  }

  componentDidMount() {
    this.setState({loadingGeoLocation: true, error: ''});
    this.getGeoLocation();
  }

  getGeoLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        this.onSuccessLoadGeoLocation,
        this.onFailedLoadGeoLocation,
        GEO_OPTIONS
      );
    } else {
      this.setState({error: 'Your browser does not support geolocation!'});
    }
  }

  onSuccessLoadGeoLocation = (position) => {
    console.log(position);
    const { latitude, longitude } = position.coords;
    localStorage.setItem(POS_KEY, JSON.stringify({latitude, longitude}));
    this.setState({loadingGeoLocation: false, error: ''});
    this.loadNearbyPosts();
  }

  onFailedLoadGeoLocation = () => {
    this.setState({loadingGeoLocation: false, error: 'Failed to get user location'});
  }

  getPanelContent = (type) => {
    if (this.state.error) {
      return <div>{this.state.error}</div>;
    } else if (this.state.loadingGeoLocation) {
      return <Spin tip="Loading geo location..."/>;
    } else if (this.state.loadingPosts) {
      return <Spin tip="Loading posts..."/>;
    } else if (this.state.posts && this.state.posts.length > 0) {
      if (type === 'image') {
        return this.getImagePosts();
      } else {
        return this.getVideoPosts();
      }
    } else {
      return null;
    }
  }

  getImagePosts = () => {
    const images = this.state.posts
      .filter((post) => post.type === 'image')
      .map(({user, message, url}) => {
        return {
          user,
          caption: message,
          src: url,
          thumbnail: url,
          thumbnailWidth: 400,
          thumbnailHeight: 300
        }
      });
    return <Gallery images={images}/>;
  }

  getVideoPosts = () => {
    return (
      <Row gutter={24}>
        {
          this.state.posts
            .filter((post) => post.type === 'video')
            .map((post) => (
              <Col span={6} key={post.url} gutter={24}>
                <div>
                  <video className="video-block" src={post.url} controls/>
                  <p>{`${post.user}: ${post.message}`}</p>
                </div>
              </Col>
            ))
        }
      </Row>
    );
  }

  loadNearbyPosts = (center, radius) => {
    const { latitude: lat, longitude: lon } = center ? center : JSON.parse(localStorage.getItem(POS_KEY));
    const range = radius ? radius : 20;
    const endPoint = this.state.topic === 'around' ? 'search' : 'cluster';
    this.setState({loadingPosts: true});
    console.log(localStorage.getItem(TOKEN_KEY));
    $.ajax({
      url: `${API_ROOT}/${endPoint}?lat=${lat}&lon=${lon}&range=${range}&term=${this.state.topic}`,
      method: 'GET',
      headers: {
        Authorization: `${AUTH_PREFIX} ${localStorage.getItem(TOKEN_KEY)}`
      }
    }).then((posts) => {
      console.log(posts);
      posts = posts ? posts : [];
      this.setState({loadingPosts: false, error: '', posts: posts});
    }, (error) => {
      this.setState({loadingPosts: false, error: error.responseText});
    });
  }

  onTopicChange = (e) => {
    console.log('radio checked', e.target.value);
    this.setState({
      topic: e.target.value,
    }, this.loadNearbyPosts);
  }

  render() {
    const TabPane = Tabs.TabPane;
    const operations = <CreatePostButton loadNearbyPosts={this.loadNearbyPosts}/>
    return (
      <div className="main-tabs">
        <RadioGroup className="topic-radio-group" onChange={this.onTopicChange} value={this.state.topic}>
          <Radio value="around">Posts Around Me</Radio>
          <Radio value="face">Faces Around The World</Radio>
        </RadioGroup>
        <Tabs tabBarExtraContent={operations}>
          <TabPane tab="Image Posts" key="1">
            {this.getPanelContent('image')}
          </TabPane>
          <TabPane tab="Video Posts" key="2">
            {this.getPanelContent('video')}
          </TabPane>
          <TabPane tab="Map" key="3">
            <WrappedAroundMap
              googleMapURL="https://maps.googleapis.com/maps/api/js?key=AIzaSyD3CEh9DXuyjozqptVB5LA-dN7MxWWkr9s&v=3.exp&libraries=geometry,drawing,places"
              loadingElement={<div style={{ height: `100%` }} />}
              containerElement={<div style={{ height: `500px` }} />}
              mapElement={<div style={{ height: `100%` }} />}
              posts={this.state.posts}
              loadNearbyPosts={this.loadNearbyPosts}
            />
          </TabPane>
        </Tabs>
      </div>
    );
  }
}