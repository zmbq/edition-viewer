import React from 'react';
import { collateFromURL } from '../tei-processing/collation-gathering';

class Collator extends React.Component {
    state = {
        processing: false,
    }

    constructor(props: any) {
        super(props);
        this.state.processing = true;
        this.collate();
    }

    render() {
        return (
            <div>{ this.state.processing ? 'Processing...' : 'Done' }</div>
        );
    }

    async delay(ms: number) {
        return new Promise(function(resolve) { 
            setTimeout(resolve, ms)
        });
    }

    async collate() {
        const gatherer = await collateFromURL('https://raw.githubusercontent.com/PghFrankenstein/fv-data/master/standoff_Spine/spine_C01.xml');
        await gatherer.dereferencePointers();
        this.setState( { processing: false });
    }
}

export default Collator;