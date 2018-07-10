import React from 'react';
import { withRouter } from "react-router-dom";
import Tooltip from 'react-bootstrap/lib/Tooltip';
import OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger';
import { GET_USER_HEALTH } from '../apollo/serverQueries.js';
import { Query } from "react-apollo";
import { Line } from 'rc-progress';
import Error from './Error.jsx';


class UserInfo extends React.Component {

  handleSpeedometerClick = () => {
    if (this.props.displayName !== 'Login') {
      this.props.history.push('/health');
    }
  }

  render() {
    const userId = this.props.userId;
    
    return (
      <div id='user-info-container'>
        <div className='small-speedometer-click-wrapper' onClick={this.handleSpeedometerClick}>
          {userId !== '1234567890' 
            ?
            <Query
              query={GET_USER_HEALTH}
              variables={{ _id: userId }}
            >
            {({ loading, error, data }) => {
              if (loading) return null;
              if (error) return <Error />;
              
              const veggieGoal = data.user.onboard_information === 'NEED_ON_BOARDING' ? 30 : JSON.parse(data.user.onboard_information).veggieSlider;
              const mediaHealth = data.user.health / veggieGoal * 100;
              let healthBarColor;

              const healthBarTip = <Tooltip id="modal-tooltip">{data.user.health} Veggies See Health</Tooltip>;
              
              if (mediaHealth <= 39) {
                healthBarColor = 'red';
              } else if (mediaHealth >= 40 && mediaHealth < 75 ) {
                healthBarColor = 'yellow';
              } else {
                healthBarColor = 'green';
              }

              return (
                <div>
                  <OverlayTrigger overlay={healthBarTip}>
                  <div>
                      <h3>Health</h3>
                      <Line percent={mediaHealth} strokeWidth={4} trailWidth={4} strokeColor={healthBarColor} />
                      {/* <div id='line-start'>0</div>
                      <div id='line-end'>{veggieGoal}</div> */}
                  </div>
                  </OverlayTrigger>
                </div>
              );
            }}
          </Query>
          :
          null
          }
        </div>
      </div>
    );
  }

}

export default withRouter(UserInfo);