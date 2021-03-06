import React from 'react';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import FormControl from 'react-bootstrap/lib/FormControl';
import { BarChart } from 'react-easy-chart';
import { ApolloConsumer } from "react-apollo";
import { GET_SOURCE_PERSONALITY } from '../apollo/serverQueries';

class AboutOurSourcesPanel extends React.Component {
  state = {
    sources: [],
    data: {
      'needs': [],
      'values': [],
      'personality': [],
      'traits': [],
    },
    currentAttribute: 'needs',
    attributes: ['needs', 'values', 'personality', 'traits'],
  }

  componentDidMount() {
    this.setSources(this.props.sources);
  }

  handleAttributeChange = (e) => {
    this.setState({
      currentAttribute: e.target.value,
    })
  }

  setSources = (data) => {
    const sources = data.sources.map(source => {
      return source.name;
    });
    this.setState({
      sources: sources,
    });
  }

  setPersonality = (data) => {
    if (data.source.fullTextsPersonality) {
      const parsedData = JSON.parse(data.source.fullTextsPersonality);
      let newData = {};
  
      for (let key in parsedData) {
        if (key === 'needs' || key === 'values') {
          newData[key] = [];
          parsedData[key].forEach(trait => {
            newData[key].push({
              x: trait.name,
              y: trait.percentile * 100,
            })
          })
        } else if (key === 'personality') {
          newData['personality'] = [];
          newData['traits'] = [];
          parsedData.personality.forEach(bigTrait => {
            newData['personality'].push({
              x: bigTrait.name,
              y: bigTrait.percentile * 100,
            })
            bigTrait.children.forEach(smallTrait => {
              newData['traits'].push({
                x: smallTrait.name,
                y: smallTrait.percentile * 100,
              })
            })
          })
        }
      }
  
      this.setState({
        data: newData,
      });
    }
  }

  render() {
    return (
      <div eventKey="3" className="about-our-sources-panel">
       <div>
          <img id="watson-logo" src='../assets/watson.png' /> 
          <h3 className="about-our-sources-title">Select a source to get started</h3> 
          <p className="about-our-sources-tagline">We build personality profiles of our sources over time using IBM Watson's Personality Insights.</p>
          <div className="about-our-sources-header">
            <div className="about-our-sources-left-side">       
              <ApolloConsumer>
                { client => (
                  <FormGroup controlId="formControlsSelect" className="watson-dropdown">
                    <FormControl 
                      componentClass="select" 
                      placeholder="select" 
                      onChange={async (e) => {
                        if (e.target.value === '--Source--') {
                          return null;
                        }
                        const {data} = await client.query({
                          query: GET_SOURCE_PERSONALITY,
                          variables: {name: e.target.value},
                        })
                        this.setPersonality(data);
                      }}
                    >
                    <option>--Source--</option>
                    {this.state.sources.map((sourceName) => {
                      return <option value={sourceName}>{sourceName}</option>
                    })}
                  >
                  </FormControl>
                </FormGroup>
                )}
              </ApolloConsumer>

              <FormGroup controlId="formControlsSelect" className="watson-dropdown">
                <FormControl 
                  componentClass="select" 
                  placeholder="select" 
                  onChange={this.handleAttributeChange}
                >
                  {this.state.attributes.map((attributeName) => {
                    return <option value={attributeName}>{attributeName}</option>
                  })}    
                </FormControl>
              </FormGroup>
            </div>
          </div>

          <BarChart className="bar-graph"
            yDomainRange={[0, 100]}
            width={800}
            height={400}
            colorBars
            axes
            margin={{top: 20, right: 20, bottom: 30, left: 40}}
            data={this.state.data[this.state.currentAttribute]}
          />
        </div>
      </div>
    )
  }
}

export default AboutOurSourcesPanel;