import * as React from 'react';
import { Route } from 'react-router';
import Home from './components/Home';
import Layout from './components/Layout';
import Voip from './components/Voip';
import './custom.css';


export default () => (
    <Layout>
        <Route exact path='/' component={Home} />
        <Route path='/voip' component={Voip} />
    </Layout>
);
