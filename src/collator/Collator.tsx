import React from 'react';

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
        await this.delay(2500);
        this.setState( { processing: false });
    }
}

export default Collator;