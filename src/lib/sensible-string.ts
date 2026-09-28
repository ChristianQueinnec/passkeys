/**
   A class to store sensible string that is, a string that can be
   erased in place. 

   */

export class SensibleString {
    static encoder = new TextEncoder();
    static decoder = new TextDecoder();
    
    constructor (string: String) {
        this._bytes = SensibleString.encoder.encode(string);
        this._sensible = true;
    }

    get () {
        if ( this._sensible ) {
            return SensibleString.decoder.decode(this._bytes);
        }
        throw new Error('lost sensible string');
    }

    erase () {
        if ( this._sensible ) {
            for ( let i=0 ; i<this._bytes.length ; i++ ) {
                this._bytes[i] = 0;
            }
        }
        this._bytes = null;
        this._sensible = false;
        return this;
    }
}

    
