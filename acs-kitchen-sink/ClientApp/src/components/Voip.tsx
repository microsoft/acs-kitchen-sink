import { Call, IncomingCall, LocalVideoStream, PropertyChangedEvent, RemoteParticipant, RemoteVideoStream, VideoStreamRenderer, VideoStreamRendererView } from '@azure/communication-calling';
import * as React from 'react';
import { connect } from 'react-redux';
import { Button, Col, Form, FormGroup, Input, Label } from 'reactstrap';
import { ApplicationState } from '../store';
import * as IdentityStore from '../store/Identity';

type VoipProps = IdentityStore.IdentityState & typeof IdentityStore.actionCreators;

interface VoipState {
    calleeId: string | null,
    enableStartCallButton: boolean,
}

export class Voip extends React.PureComponent<VoipProps, VoipState> {
    constructor(props: VoipProps) {
        super(props);

        this.state = {
            calleeId: null,
            enableStartCallButton: false,
        };
    }

    public componentDidMount()
    {

    }

    public onChange = (e: any) => this.setState({
        calleeId: e.target.value,
        enableStartCallButton: e.target.value.length === 79
    });

    public render = (): React.ReactNode => {
        let localVideoView;
        if (this.props.localVideoStream) {
            let localVideoStreamRenderer = new VideoStreamRenderer(this.props.localVideoStream);

            localVideoStreamRenderer.createView().then(view => {
                localVideoView = view.target;
            });
        }

        console.log("localVideoView", localVideoView);

        let remoteVideoView;
        if (this.props.call?.remoteParticipants.find(p => p.videoStreams.length > 0)) {

            let remoteVideoStreamRenderer = new VideoStreamRenderer(this.props.call?.remoteParticipants[0].videoStreams[0]);

            remoteVideoStreamRenderer.createView().then(view => {
                remoteVideoView = view.target
            });
        }

        console.log("remoteVideoView", localVideoView);
        console.log("remoteVideoView", remoteVideoView);

        let callStatus = this.props.call !== null ? (
            <FormGroup row >
                <Label for="callId" sm={2}>Call ID</Label>
                <Col sm={10}>
                    <Input type="text" name="callId" id="callId" value={this.props.call?.id} readOnly />
                </Col>
                <Label for="callState" sm={2}>Call State</Label>
                <Col sm={10}>
                    <Input type="text" name="callState" id="callState" value={this.props.call?.state} readOnly />
                </Col>
            </FormGroup>) : (<div></div>);

        return (<>
            <h1>Voice over Internet Protocol</h1>
            <Form>
                <FormGroup row >
                    <Label for="callee" sm={2}>Callee</Label>
                    <Col sm={10}>
                        <Input type="text" name="callee" id="callee" placeholder="Recipient ACS ID" onChange={this.onChange} />
                    </Col>
                    <br />
                </FormGroup>
                {callStatus}
            </Form>
            <br />
            <Button disabled={!this.state.enableStartCallButton} onClick={() => this.props.startCall(this.state.calleeId)}>Start Call</Button>
            {/*<Button>Hang up Call</Button>*/}
            {/*<Button>Accept Call</Button>*/}
            {/*<Button>Start Video</Button>*/}
            {/*<Button>Stop Video</Button>*/}
            {localVideoView ? <div className="local-video-container">{localVideoView}</div> : <></>}
            {remoteVideoView ? <div className="remote-video-container">{remoteVideoView}</div> : <></>}
        </>);
    }
}

export default connect((state: ApplicationState) => state.identity, IdentityStore.actionCreators)(Voip as any);
