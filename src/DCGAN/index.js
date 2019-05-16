// Copyright (c) 2018 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/*
DCGAN
This version is based on alantian's TensorFlow.js implementation: https://github.com/alantian/ganshowcase
*/

import * as tf from '@tensorflow/tfjs';
import callCallback from '../utils/callcallback';
import * as p5Utils from '../utils/p5Utils';

const allModelInfo = {
    face: {
        description: 'DCGAN, human faces, 64x64',
        modelUrl: "https://raw.githubusercontent.com/viztopia/ml5dcgan/master/model/model.json", // "https://github.com/viztopia/ml5dcgan/blob/master/model/model.json",
        modelSize: 64,
        modelLatentDim: 128
    }
};

class DCGANBase{
    constructor(modelName, readyCb){
        this.modelCache = {};
        this.modelName = modelName;
        this.model = null;
        this.ready = callCallback(this.loadModel(), readyCb);
    }

    async loadModel() {
        const {modelName} = this;
        const modelInfo = allModelInfo[modelName];
        const {modelUrl} = modelInfo;

        if (modelName in this.modelCache) {
            this.model = this.modelCache[modelName];
            return this;
        }

        this.model = await tf.loadLayersModel(modelUrl);
        this.modelCache[modelName] = this.model;
        return this;
    }

    async generate(callback){
        return callCallback(this.generateInternal(), callback);
    }
    
    async compute(latentDim) {
        const y = tf.tidy(() => {
            const z = tf.randomNormal([1, latentDim]);
            // TBD: should model be a parameter to compute or is it ok to reference this.model here?
            const yDim = this.model.predict(z).squeeze().transpose([1, 2, 0]).div(tf.scalar(2)).add(tf.scalar(0.5));
            return yDim;
        });

        return y;
    }

    async generateInternal() {
        const modelInfo = allModelInfo[this.modelName];
        const {modelLatentDim} = modelInfo;
        const imageTensor = await this.compute(modelLatentDim);

        // get the raw data from tensor
        const raw = await tf.browser.toPixels(imageTensor);
      
        // get the blob from raw
        const [imgHeight, imgWidth] = imageTensor.shape;
        const blob = await p5Utils.rawToBlob(raw, imgWidth, imgHeight);

        // get the p5.Image object
        let p5Image;
        if(p5Utils.checkP5()){
            p5Image = await p5Utils.blobToP5Image(blob);
        }

        // wrap up the final js result object
        const result =  {};
        result.blob = blob;
        result.raw = raw;
        result.tensor = imageTensor;

        if(p5Utils.checkP5()){
            result.image = p5Image;
        }

        return result;

    }

}

const DCGAN = (modelName, callback) => new DCGANBase( modelName, callback ) ;

export default DCGAN;
