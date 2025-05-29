/*
 * @Author: aaa@163.com
 * @Date: 2025-05-28 15:25:15
 * @LastEditors: aaa@163.com
 * @LastEditTime: 2025-05-29 16:15:50
 * @FilePath: \onnx_hand_pose_web\worker\modelProcessing.js
 * @Description: 
 */
importScripts(
    "../js/ort.min_v1.20.js"
)
let model = null;
let inputName = null;
let outputName = null;
function initModel() {
    ort.env.wasm.proxy = true;
    ort.InferenceSession.create("../models/YOLOv10n_gestures_FP16.onnx", {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
    }).then((res) => {
        model = res;
        inputName = model.inputNames[0];
        outputName = model.outputNames[0];
        console.log(inputName, outputName)
        postMessage({ type: "modelLoaded", success: true });
    }).catch(err => {
        postMessage({ type: "modelLoaded", success: false, errMsg: err });
    })
}
function processOutput(outputTensor) {
    // 获取数据
    const outputData = outputTensor.data;
    const outputDims = outputTensor.dims;
    const numBoxes = outputDims[1];
    const boxDataLength = outputDims[2]
    let confidenceMax = 0.5;
    let confidenceIndex = 0;
    let classIdIndx = 0;
    let xIndex = 0;
    let yIndex = 0;
    let wIndex = 0;
    let hIndex = 0;
    for (let i = 0; i < numBoxes; i += boxDataLength) {
        const confidence = outputData[i + 4];
        if (confidence > confidenceMax) {
            confidenceMax = confidence;
            confidenceIndex = i + 4;
            classIdIndx = i + 5;
            xIndex = i;
            yIndex = i + 1;
            wIndex = i + 2;
            hIndex = i + 3;
        }
    }
    if (confidenceIndex === 0) {
        return []
    }
    const classId = outputData[classIdIndx];
    const x = outputData[xIndex]
    const y = outputData[yIndex]
    const w = outputData[wIndex]
    const h = outputData[hIndex]
    return [
        x, y, w, h, confidenceMax, classId
    ]
}
async function run_model(input, size) {
    const inputTensor = new ort.Tensor('float32', input, [1, 3, size, size]);
    const outputs = await model.run({ images: inputTensor });
    inputTensor.dispose()
    return processOutput(outputs["output0"])
    // return outputs["output0"].data;
}
var offCtx = null;
self.onmessage = async (event) => {
    const { input, type, size } = event.data;
    if (type === "initModel") {
        initModel()
        return;
    }
    if (type === "inputData") {
        // 转换为float32并归一化
        let float32Data = new Float32Array(3 * size * size);
        for (let i = 0; i < input.length; i += 4) {
            float32Data[i / 4] = input[i] / 255.0;   // R
            float32Data[i / 4 + 1] = input[i + 1] / 255.0; // G
            float32Data[i / 4 + 2] = input[i + 2] / 255.0; // B
        }
        const output = await run_model(float32Data, size);
        float32Data = null;
        postMessage({ type: "modelResult", result: output });
        return;
    }

};
