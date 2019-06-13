import { stringify } from "querystring";

interface Pointer {
    url: string,
    xpath: string,
}

export class CollationGathering {
    private _tei: string;
    private  _xmls : Map<string, Document>;  // Map from URL to a parsed XML

    constructor(tei: string) {
        this._tei = tei;
        this._xmls = new Map<string, Document>();
    }

    private async fetchXML(url: string) {
        const response = await fetch(url);
        const xml = await response. text();
        const parser = new DOMParser();
        const dom = parser.parseFromString(xml, 'text/xml');
        this._xmls.set(url, dom);
    }

    private getXML(url: string): Document {
        if (!this._xmls.has(url)) {
            throw new Error(`Can't find the XML for ${url}. Did you forget to fetch it?`);
        }

        return this._xmls.get(url)!; // The ! means we are cetain 'undefined' will not be returned
    }

    private parsePointer(ptr: Element): Pointer {
        const attr = ptr.attributes.getNamedItem('target');
        if (!attr) {
            throw new Error(`ptr ${ptr} has no target attribute`);
        }
        const target = attr.value;

        const parts = target.split('#')
        if (parts.length != 2) {
            throw new Error(`Target ${target} is not well formatted. Expected uri#xpath`);
        }

        return {
            url: parts[0],
            xpath: parts[1]
        };
    }

    public async dereferencePointers() {
        const parser = new DOMParser();
        const dom = parser.parseFromString(this._tei, 'text/xml');

        const ptrElements = Array.from(dom.getElementsByTagName('ptr'));
        const pointers = ptrElements.map((ptr) => this.parsePointer(ptr));

        // First, fetch all URLs
        const urlSet = new Set(pointers.map((ptr) => ptr.url));
        const urls = Array.from(urlSet);
        const promises = urls.map((url) => this.fetchXML(url));
        await Promise.all(promises);

        // Now we can dereference all the pointers
        for(const ptr of pointers) {
            this.dereferencePointer(ptr);
        }
    }

    private async dereferencePointer(ptr: Pointer) {
        const dom = this.getXML(ptr.url);
        const result = dom.evaluate(ptr.xpath, dom);
        console.log(result);
    }
}

export async function collateFromURL(url: string): Promise<CollationGathering> {
    const response = await fetch(url);
    const xml = await response.text();

    return new CollationGathering(xml);
}

export function collateFromElement(id: string): CollationGathering {
    const elem = document.getElementById(id);
    if (!elem) {
        throw new Error(`Can't find element with id ${id}`);
    }

    const xml = elem.innerHTML;

    return new CollationGathering(xml);
}