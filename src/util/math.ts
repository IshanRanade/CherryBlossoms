import { mat4, vec3 } from 'gl-matrix'

// return mvp matrix from given aspect, position, rotation, scale
function getMvpMatrix() {
    let modelMatrix = getModelViewMatrix();
    let viewMatrix = getViewMatrix();
    let projectionMatrix = getProjectionMatrix();
    
    mat4.multiply(viewMatrix, projectionMatrix, viewMatrix);
    mat4.multiply(modelMatrix, viewMatrix, modelMatrix);
    return modelMatrix;
}

// return modelView matrix from given position, rotation, scale
function getModelViewMatrix() {
    let modelMatrix = mat4.create();
    return modelMatrix;
}

function getViewMatrix() {
    let cameraPosition = vec3.fromValues(10.0, 10.0, 10.0);
    let lookAtPosition = vec3.fromValues(0.0, 0.0, 0.0);
    let upDirection = vec3.fromValues(0.0, 1.0, 0.0);
    
    let viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, cameraPosition, lookAtPosition, upDirection);
    return viewMatrix;
}

function getProjectionMatrix(
    aspect: number = (4.0 / 3.0),
    fov: number = 120,
    near: number = 0.1,
    far: number = 100.0,
) {
    var perspectiveMatrix = mat4.create();
    mat4.perspective(perspectiveMatrix, fov * 0.017453, aspect, near, far);
    return perspectiveMatrix;
}

export { getMvpMatrix }