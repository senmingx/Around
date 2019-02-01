import React from 'react';
import $ from 'jquery';
import { Modal, Button, message } from 'antd';
import { WrappedCreatePostForm } from "./CreatePostForm";
import {API_ROOT, AUTH_PREFIX, LOC_SHAKE, POS_KEY, TOKEN_KEY} from "../constants";

export class CreatePostButton extends React.Component {
  state = {
    visible: false,
    confirmLoading: false,
  }

  showModal = () => {
    this.setState({
      visible: true,
    });
  }

  handleOk = () => {
    this.setState({ confirmLoading: true });
    this.form.validateFields((err, values) => {
      if (!err) {
        const { latitude: lat, longitude: lon } = JSON.parse(localStorage.getItem(POS_KEY));
        const formData = new FormData();
        formData.set('lat', lat + LOC_SHAKE * Math.random() * 2 - LOC_SHAKE);
        formData.set('lon', lon + LOC_SHAKE * Math.random() * 2 - LOC_SHAKE);
        formData.set('message', values.message);
        formData.set('image', values.image[0].originFileObj);

        $.ajax({
          url: `${API_ROOT}/post`,
          method: 'POST',
          data: formData,
          headers: {
            Authorization: `${AUTH_PREFIX} ${localStorage.getItem(TOKEN_KEY)}`,
          },
          processData: false,
          contentType: false,
          dataType: 'text',
        }).then(() => {
          message.success("Create a post successfully");
          this.form.resetFields();
          this.setState({ visible: false, confirmLoading: false });
          this.props.loadNearbyPosts();
        }, () => {
          message.error("Failed to create a post");
          this.setState({ visible: false, confirmLoading: false });
        }).catch((error) => {
          console.log(error);
        });
      }
    });

  }

  handleCancel = () => {
    console.log('Clicked cancel button');
    this.setState({
      visible: false,
    });
  }

  saveFormRef = (formInstance) => {
    console.log(formInstance);
    this.form = formInstance;
  }

  render() {
    const { visible, confirmLoading, ModalText } = this.state;
    return (
      <div>
        <Button type="primary" onClick={this.showModal}>
          Create Post
        </Button>
        <Modal
          title="Create New Post"
          visible={visible}
          onOk={this.handleOk}
          okText="Create"
          confirmLoading={confirmLoading}
          onCancel={this.handleCancel}
        >
          <WrappedCreatePostForm ref={this.saveFormRef}/>
        </Modal>
      </div>
    );
  }
}