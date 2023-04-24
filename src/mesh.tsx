import { Mesh as MeshObject } from 'webgl-obj-loader';

class Mesh {
    objMesh: any;
    vertexBuffer: Float32Array;
    indexBuffer: Uint16Array;

    private constructor(objString: string) {
        this.objMesh = new MeshObject(objString);

        const kVertexStride = 8;
        const vertexCount = this.objMesh.vertices.length / 3;
        this.vertexBuffer = new Float32Array(kVertexStride * vertexCount);

        for (let i = 0; i < vertexCount; ++i) {
            const offset = kVertexStride * i;

            this.vertexBuffer.set(this.objMesh.vertices[(i * 3) + 0], offset + 0);
            this.vertexBuffer.set(this.objMesh.vertices[(i * 3) + 1], offset + 1);
            this.vertexBuffer.set(this.objMesh.vertices[(i * 3) + 2], offset + 2);

            this.vertexBuffer.set(this.objMesh.vertexNormals[(i * 3) + 0], offset + 3);
            this.vertexBuffer.set(this.objMesh.vertexNormals[(i * 3) + 1], offset + 4);
            this.vertexBuffer.set(this.objMesh.vertexNormals[(i * 3) + 2], offset + 5);

            this.vertexBuffer.set(this.objMesh.textures[(i * 2) + 0], offset + 6);
            this.vertexBuffer.set(this.objMesh.textures[(i * 2) + 1], offset + 7);
        }

        const indexCount = this.objMesh.indices.length;
        this.indexBuffer = new Uint16Array(indexCount);
        for (let i = 0; i < indexCount; ++i) {
            this.indexBuffer.set(this.objMesh.indices[i], i);
        }
    }

    static async createMesh(filepath: string): Promise<Mesh> {
        return new Promise((resolve, reject) => {
            fetch(filepath).then((response) => {
                return response.blob();
            }).then((fileBlob) => {
                return readFile(fileBlob);
            });
        });
        
        function readFile(blob: Blob) {
            return new Promise((resolve, reject) => {
                let fr = new FileReader();
                fr.onload = x => resolve(fr.result);
                fr.onerror = reject;
                fr.readAsText(blob);
            })
        }
    }

    getVertexBuffer(): Float32Array {
        return this.vertexBuffer;
    }

    getIndexBuffer(): Uint16Array {
        return this.indexBuffer;
    }
};

export { Mesh };