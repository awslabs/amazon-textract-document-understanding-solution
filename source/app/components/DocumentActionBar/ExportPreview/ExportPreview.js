import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Box,
  Flex,
  Button,
} from '@chakra-ui/react';
import { connect } from 'react-redux';
import queryString from 'query-string';
import { ExportTypes, downloadRedactedDocument } from '../../../utils/downloadRedactedDocument';
import { getDocumentById } from '../../../store/entities/documents/selectors';
import { getDocumentPageCount, getAreRedactionsOnDocument } from '../../../utils/document';
import { Document, Page } from 'react-pdf';
import Loading from '../../Loading/Loading';
import { DocumentMarks, useDocumentResizer } from '../../DocumentViewer/DocumentViewer';
import DownloadIcon from './DownloadIcon';
import { ActionBarButton } from '../ActionBarButton/ActionBarButton';

const ExportPreview = ({ document }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { containerRef, documentWidth, handleResize } = useDocumentResizer(true, []);
  const [isExporting, setIsExporting] = React.useState(false);

  const readableDocumentName = document.documentName.replace(/\.(pdf|PDF|png|PNG|jpg|JPG|jpeg|JPEG)/, '');
  const pageCount = getDocumentPageCount(document);

  const downloadRedactedDocumentWithDownloadingState = async (exportType) => {
    try {
      setIsExporting(true);
      await downloadRedactedDocument(document, exportType);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <ActionBarButton onClick={onOpen} disabled={!getAreRedactionsOnDocument(document)}>
        Export Redacted Doc
      </ActionBarButton>

      <Modal isOpen={isOpen} onClose={onClose} isCentered size='6xl' scrollBehavior='inside'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg='#f2f4f4' color='#000'>
            <Flex alignItems='center'>
              <Box flex='1'>
                <Box flex='1'>Preview Redactions and Export</Box>

                <Box as='dl' my={0} fontSize='1rem'>
                  <Box as='dt' d='inline-block' fontWeight='normal'>
                    Document Name:
                  </Box>
                  <Box as='dd' d='inline-block' ml={1} mr={10}>
                    {readableDocumentName}
                  </Box>

                  <Box as='dt' d='inline-block' fontWeight='normal'>
                    Total pages:
                  </Box>
                  <Box as='dd' d='inline-block' ml={1}>
                    {pageCount}
                  </Box>
                </Box>
              </Box>

              <Menu placement='bottom' justifySelf='flex-end'>
                <MenuButton
                  as={Button}
                  isLoading={isExporting}
                  bg='orange'
                  _hover={{ background: '#f6761d' }}
                  _active={{ background: '#f6761d' }}
                >
                  Download Redacted Doc
                </MenuButton>
                <MenuList bg='#666' color='#fff'>
                  <MenuItem
                    bg='inherit'
                    border='none'
                    justifyContent='center'
                    fontSize='1rem'
                    onClick={() => downloadRedactedDocumentWithDownloadingState(ExportTypes.PDF)}
                  >
                    <DownloadIcon />{' '}
                    <Box ml={2} width='40px'>
                      PDF
                    </Box>
                  </MenuItem>
                  <MenuItem
                    bg='inherit'
                    border='none'
                    justifyContent='center'
                    fontSize='1rem'
                    onClick={() => downloadRedactedDocumentWithDownloadingState(ExportTypes.PNG)}
                  >
                    <DownloadIcon />{' '}
                    <Box ml={2} width='40px'>
                      PNG
                    </Box>
                  </MenuItem>
                </MenuList>
              </Menu>

              <ModalCloseButton border='none' bg='#f2f4f4' position='static' />
            </Flex>
          </ModalHeader>

          <ModalBody bg='#fff' color='#000'>
            <div ref={containerRef}>
              <Document
                file={document.searchablePdfURL}
                loading={<Loading />}
                onLoadSuccess={() => setTimeout(handleResize, 0)}
              >
                {Array(pageCount)
                  .fill(null)
                  .map((_, i) => i + 1)
                  .map((pageNumber) => (
                    <Box key={pageNumber} mb={10}>
                      <DocumentMarks
                        redactions={document.redactions ? document.redactions[pageNumber] : []}
                        isExportPreview
                      >
                        <Page
                          width={documentWidth}
                          loading={<Loading />}
                          pageNumber={pageNumber}
                          renderAnnotationLayer={false}
                        />
                      </DocumentMarks>
                    </Box>
                  ))}
              </Document>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default connect((state) => {
  const { id } = queryString.parse(location.search);

  return {
    document: getDocumentById(state, id),
  };
})(ExportPreview);
