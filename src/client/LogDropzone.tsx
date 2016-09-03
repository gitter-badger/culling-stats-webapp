import * as React from 'react';
import * as Dropzone from 'react-dropzone';
import { ICullingParser } from 'culling-log-parser';


interface IProps {
  onParsed: (output: ICullingParser.IParseLogOutput) => any;
}

interface IState {
  minimized: boolean;
  inputSelected: boolean;
  files: Array<File>;
  isParsingLogs: boolean;
  parsePercent: number;
};

const defaultState: IState = {
  files: [],
  inputSelected: false,
  isParsingLogs: false,
  minimized: false,
  parsePercent: 0,
};

export default class LogDropZone extends React.Component<IProps, IState> {

  constructor(props: IProps) {
    super(props);
    this.resetState();
  }

  private resetState() {
    if (this.state) {
      this.setState(defaultState);
    } else {
      this.state = defaultState;
    }
  }

  private onDrop(files: Array<File>) {
    this.setState({
      files,
      isParsingLogs: true,
      parsePercent: 0,
    } as IState, () => {
      const worker = new Worker('/static/worker.js');
      worker.postMessage(files);

      worker.onmessage = (event: MessageEvent) => {
        if (!event.data.type) {
          console.error('Bad data from worker!');
        }
        switch (event.data.type) {
          case 'started':
            console.log('Starting to parse');
            this.setState({
              parsePercent: 1,
            } as IState);
            break;
          case 'progress':
            this.setState({
              parsePercent: event.data.progress,
            } as IState);
            break;
          case 'done':
            this.setState({
              files: [],
              inputSelected: false,
              isParsingLogs: false,
              minimized: true,
              parsePercent: 0,
            });
            this.props.onParsed(event.data.output);
            break;
          case 'error':
            this.resetState();
            alert('Parsing the logs failed. Please throw some sticks at the code monkeys.');
            console.error('Error from worker!', event.data.stack || event.data.error);
            break;
          default:
            console.error(`Unknown type '${event.data.type}' from worker!`);
        }
      };
    });
  }

  private onReject() {
    alert('Only log files please.');
  }

  private onClickInput(e: __React.MouseEvent) {
    const target = e.target as any; // WHAT THE F.U.N.C.
    target.select();
  }


  public render() {
    let innerClassName = '';
    if (!this.state.minimized) {
      innerClassName += 'jumbotron';
    }
    const loadingClass = this.state.isParsingLogs ? 'loader loading' : 'loader';
    const loadingBarWidthStyle = { width: `${this.state.parsePercent}%` };
    return (
      <Dropzone
        onDrop={this.onDrop.bind(this)}
        className='dropzone col-lg-12'
        activeClassName='dropzoneActive'
        rejectClassName='dropzoneRejected'
        onDropRejected={this.onReject.bind(this)}
        disableClick={true}
        disablePreview={true}
        accept='.log'>
        <div className={loadingClass}>
          <div className='progress'>
            <div className='progress-bar' role='progressbar'
              aria-valuenow={this.state.parsePercent} aria-valuemin='0'
              aria-valuemax='100' style={loadingBarWidthStyle}>
              <span className='sr-only'>
                0% Complete
              </span>
            </div>
            { this.state.parsePercent >= 99 && <img className="grayFace" src='./images/GrayFaceNoSpace.png' /> }
          </div>
        </div>
        <div className={innerClassName}>
          <h2>Drag & Drop Victory.log files here</h2>
          <p className='lead'>
            You can find your Culling logs here:&nbsp;
            <input onClick={this.onClickInput.bind(this)} selected={true} readOnly={true}
              size={33} value='%localappdata%\\Victory\\Saved\\Logs' />
            <br/>
            These files will <b>not</b> be uploaded, they will be processed in your browser and then displayed.
            <br/>
            When you leave this page, they are forgotten.
          </p>
        </div>
      </Dropzone>
    );
  }
}

