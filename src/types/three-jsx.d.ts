import { MeshStandardMaterial } from 'three';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      meshBasicMaterial: {
        wireframe?: boolean;
        color?: string;
      } & React.DetailedHTMLProps<React.HTMLAttributes<MeshStandardMaterial>, MeshStandardMaterial>;
      meshStandardMaterial: {
        transparent?: boolean;
        metalness?: number;
        roughness?: number;
        opacity?: number;
        color?: string;
      } & React.DetailedHTMLProps<React.HTMLAttributes<MeshStandardMaterial>, MeshStandardMaterial>;
    }
  }
}
