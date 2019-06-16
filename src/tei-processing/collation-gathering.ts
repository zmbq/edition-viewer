import { fetchXML, parseXML, evaluateXPath } from "./helpers";

interface Pointer {
    url: string,
    xpath: string,
}

export class CollationGathering {
    private _collationDoc: Document;
    private  _xmls : Map<string, Document>;  // Map from URL to a parsed XML

    constructor(tei: Document) {
        this._collationDoc = tei;
        this._xmls = new Map<string, Document>();
    }

    public get collation() {
        return _collationDoc;
    }
    
    private async loadXML(url: string) {
        // The URLs in the collaction documents are not accurate. We need to patch them, while keeping
        // the original URLs in the collation document.
        const patchedURL = this.patchURL(url);
        const doc = await fetchXML(patchedURL);
        this._xmls.set(url, doc);
    }

    private getXML(url: string): Document {
        if (!this._xmls.has(url)) {
            throw new Error(`Can't find the XML for ${url}. Did you forget to fetch it?`);
        }

        return this._xmls.get(url)!; // The ! means we are cetain 'undefined' will not be returned
    }

    private patchURL(url: string) {
        return url;
        // This function is here to overcome a discrepancy in the URLs.
        // The Collation XMLs have URLs like https://raw.githubusercontent.com/PghFrankenstein/fv-data/master/edition-chunks/P5-f1818_C07.xml
        // While the real URL Should be      https://raw.githubusercontent.com/PghFrankenstein/fv-data/master/variorum-chunks/f1818_C07.xml
        
        const patched = url.replace('edition-chunks/P5-', 'variorum-chunks/');
        if (patched === url) {
            console.error(`Can't patch URL ${url}`);
            throw new Error(`Can't patch URL ${url}`);
        }

        return patched;
    }

    private parsePointer(ptr: Element): Pointer {
        const attr = ptr.attributes.getNamedItem('target');
        if (!attr) {
            throw new Error(`ptr ${ptr} has no target attribute`);
        }
        const target = attr.value;

        const parts = target.split('#')
        if (parts.length !== 2) {
            throw new Error(`Target ${target} is not well formatted. Expected uri#xpath`);
        }

        return {
            url: parts[0],
            xpath: parts[1]
        };
    }

    public async dereferencePointers() {
        const ptrElements = Array.from(this._collationDoc.getElementsByTagName('ptr'));
        const pointers = ptrElements.map((ptr) => this.parsePointer(ptr));

        // First, fetch all URLs
        const urlSet = new Set(pointers.map((ptr) => ptr.url));
        const urls = Array.from(urlSet);
        const promises = urls.map((url) => this.loadXML(url));
        await Promise.all(promises);

        // Now we can dereference all the pointers
        for(const ptr of pointers) {
            this.dereferencePointer(ptr);
        }
    }

    private dereferencePointer(ptr: Pointer) {
        const dom = this.getXML(ptr.url);

        // Most paths we have are actually just element IDs. Build an xpath expression for them:
        const xpath = `//*[@xml:id="${ptr.xpath}"]`;
        const idResults = evaluateXPath(dom, xpath);
        console.debug(`ID search ${ptr.xpath}: ${idResults}`);

        if (idResults.length) { 
            return idResults;
        }

        const xpathResults = evaluateXPath(dom, ptr.xpath);
        console.debug(`XPath search ${ptr.xpath}: ${xpathResults}`);

        if(xpathResults.length) {
            return xpathResults;
        }

        console.error(`Can't resolve pointer ${ptr.xpath}`);
    }
}

export async function collateFromURL(url: string): Promise<CollationGathering> {
    const doc = await fetchXML(url);
    return new CollationGathering(doc);
}

export function collateFromElement(id: string): CollationGathering {
    const elem = document.getElementById(id);
    if (!elem) {
        throw new Error(`Can't find element with id ${id}`);
    }

    const xml = elem.innerHTML;
    const doc = parseXML(xml);
    return new CollationGathering(doc);
}