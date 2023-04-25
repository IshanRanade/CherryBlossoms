import { mat4, vec3 } from 'gl-matrix'

// return mvp matrix from given aspect, position, rotation, scale
function getMvpMatrix(cameraPosition: vec3, lookAtPosition: vec3, upDirection: vec3, 
    aspect: number, fov: number, near: number, far: number) {

    let modelMatrix = getModelViewMatrix();
    let viewMatrix = getViewMatrix(cameraPosition, lookAtPosition, upDirection);
    let projectionMatrix = getProjectionMatrix(aspect, fov, near, far);
    
    mat4.multiply(viewMatrix, projectionMatrix, viewMatrix);
    mat4.multiply(modelMatrix, viewMatrix, modelMatrix);
    return modelMatrix;
}

// return modelView matrix from given position, rotation, scale
function getModelViewMatrix() {
    let modelMatrix = mat4.create();
    return modelMatrix;
}

function getViewMatrix(cameraPosition: vec3, lookAtPosition: vec3, upDirection: vec3) {
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