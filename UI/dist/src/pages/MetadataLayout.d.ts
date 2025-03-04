import React from "react";
interface MetadataData {
    [key: string]: any;
}
interface MetadataLayoutProps {
    data: MetadataData;
    onChange: (event: {
        name: string;
        value: any;
    }) => void;
}
declare const MetadataLayout: React.FC<MetadataLayoutProps>;
export default MetadataLayout;
