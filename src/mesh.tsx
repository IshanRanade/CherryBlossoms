import { Mesh as MeshObject } from 'webgl-obj-loader';

class Mesh {
    objMesh: any;
    vertexBuffer: Float32Array;
    indexBuffer: Uint16Array;

    private constructor(objString: string) {
        this.objMesh = new MeshObject(objString);

        if(!this.objMesh) {
            throw new Error('Could not load mesh obj');
        }

        const kVertexStride = 8;
        const vertexCount = this.objMesh.vertices.length / 3;
        this.vertexBuffer = new Float32Array(kVertexStride * vertexCount);

        for (let i = 0; i < vertexCount; ++i) {
            const offset = kVertexStride * i;

            this.vertexBuffer[offset + 0] = this.objMesh.vertices[(i * 3) + 0];
            this.vertexBuffer[offset + 1] = this.objMesh.vertices[(i * 3) + 1];
            this.vertexBuffer[offset + 2] = this.objMesh.vertices[(i * 3) + 2];

            this.vertexBuffer[offset + 3] = this.objMesh.vertexNormals[(i * 3) + 0];
            this.vertexBuffer[offset + 4] = this.objMesh.vertexNormals[(i * 3) + 1];
            this.vertexBuffer[offset + 5] = this.objMesh.vertexNormals[(i * 3) + 2];

            if(this.objMesh.textures.length === 0) {
                this.vertexBuffer[offset + 6] = 0;
                this.vertexBuffer[offset + 7] = 0;
            } else {
                this.vertexBuffer[offset + 6] = this.objMesh.textures[(i * 2) + 0];
                this.vertexBuffer[offset + 7] = this.objMesh.textures[(i * 2) + 1];
            }
        }

        const indexCount = this.objMesh.indices.length;
        this.indexBuffer = new Uint16Array(indexCount);
        for (let i = 0; i < indexCount; ++i) {
            this.indexBuffer[i] = this.objMesh.indices[i];
        }
    }

    static async createMeshWithText(text: string) {
        return new Mesh(text);
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