/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

export interface IWebViewConnectionInfo {
    description: string;
    faviconUrl: string;
    id: string;
    title: string;
    type: string;
    url: string;
    devtoolsActivePort?: string;
}
