import * as React from 'react';
import { connect } from 'react-redux';

const Home = () => (
    <div>
        <h1>Welcome!</h1>
        <p>This project is a compilation of different Azure Communication Service Quickstarts, created as an exercise to see how the different features might come together.</p>
        <p>Features highlighted here:</p>
        <ul>
            <li>VoIP</li>
            <li>Video Chat</li>
            <li>Chat</li>
            <li>SMS</li>
        </ul>
        <p>You have been provided with an auto-generated identity part of which is seen in the top-right and can be copied to your clipboard with a button.</p>
        <p>To test calling, try opening up two instances of the application and calling one instance from another using the identity generated for each.</p>
    </div>
);

export default connect()(Home);
