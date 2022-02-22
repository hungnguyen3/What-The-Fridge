import React, { useEffect, useMemo, useState } from 'react';
import {
	Box,
	Button,
	Center,
	Image,
	Select,
	Text,
	useColorMode,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import {
	useDeleteGroceryItemMutation,
	useGetUserFridgesQuery,
	useMoveGroceryItemToFridgeMutation,
} from '../../../generated/graphql';
import { Table } from '../../fridges/FridgeItemTable/FridgeItemTable';
import { Styles } from '../../fridges/FridgeItemTable/TableStyles';
import { useAppContext } from '../../../utils/context';
import Link from 'next/link';
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../../Firebase';

export interface TableData {
	img: null | undefined | string;
	name: string;
	quantity: number | string;
	unit?: string;
	id: number;
	upc: string | null | undefined;
	userId: number;
	measurementTypeId: number;
	imgUrl: string | null | undefined;
}

interface GroceryItemTableProps {
	data?: () => TableData[];
	rerenderTime: number;
	groceryListId: number;
}

const GroceryItemTable = (props: GroceryItemTableProps) => {
	const router = useRouter();
	const value = useAppContext();
	const [selectedFridge, setSelectedFridge] = useState(0);
	const [selectedRows, setSelectedRows] = useState<any[]>([]);
	const [, deleteGroceryItem] = useDeleteGroceryItemMutation();
	const [, moveGroceryItemToFridge] = useMoveGroceryItemToFridgeMutation();
	const { colorMode } = useColorMode();
	const isDark = colorMode === 'dark';

	const centeredText = (text: string) => {
		return (
			<Center style={{ height: '100%' }}>
				<Text align="center">{text}</Text>
			</Center>
		);
	};

	const columns = useMemo(
		() => [
			{
				Header: centeredText('Image'),
				accessor: 'img',
				disableFilters: true,
				Cell: (props: any) => {
					if (props.row.original.img)
						return (
							<Center>
								<Image
									src={props.row.original.img}
									maxWidth="200"
									maxHeight="200"
									alt="Player"
								/>
							</Center>
						);

					return centeredText('-');
				},
			},
			{
				Header: centeredText('Name'),
				accessor: 'name',
				Cell: (props: any) => {
					if (props.row.original.name)
						return centeredText(props.row.original.name);
					return centeredText('-');
				},
			},
			{
				Header: centeredText('Quantity'),
				accessor: 'quantity',
				Cell: (props: any) => {
					if (props.row.original.quantity && props.row.original.unit)
						return centeredText(
							`${props.row.original.quantity} ${props.row.original.unit}`
						);
					return centeredText('-');
				},
			},
		],
		[]
	);

	const noData = () => [
		{
			img: 'N/A',
			name: 'N/A',
			quantity: 'N/A',
			unit: 'N/A',
			id: 0,
			infoId: 0,
			upc: null,
			userId: 0,
			measurementTypeId: 0,
			imgUrl: null,
		},
	];

	const data = useMemo(props.data ? props.data : noData, []);

	// WARNING: this function works but would be better to find a better solution
	// This wouldn't work if file url contains special characters
	// We have removed all special characters from the files' names before upload
	function getPathStorageFromUrl(url: String) {
		const baseUrl =
			'https://firebasestorage.googleapis.com/v0/b/whatthefridge-fa945.appspot.com/o/';

		let imagePath: string = url.replace(baseUrl, '');
		const indexOfEndPath = imagePath.indexOf('?');
		imagePath = imagePath.substring(0, indexOfEndPath);
		imagePath = imagePath.replaceAll('%2F', '/');
		imagePath = imagePath.replaceAll('%40', '@');
		return imagePath;
	}

	useEffect(() => {}, []);

	// user fridges
	let [{ data: userFridges, fetching: fetchingFridges }] =
		useGetUserFridgesQuery({
			variables: {
				userId: value[0].id,
			},
		});

	let allFridges = userFridges?.getUserFridges.fridges
		? userFridges?.getUserFridges.fridges
		: [{ id: -1 }];

	let fridgeId = allFridges[selectedFridge]?.id;

	const moveSelected = async () => {
		let success = true;
		for (let i = 0; i < selectedRows.length; i++) {
			let element = selectedRows[i];
			const weekInMilliseconds = 7 * 24 * 60 * 60 * 1000;
			const groceryItemInput = {
				fridgeId: fridgeId,
				measurementTypeId: element.original.measurementTypeId,
				name: element.original.name,
				quantity: element.original.quantity,
				userId: element.original.userId,
				imgUrl: element.original.imgUrl,
				upc: element.original.upc,
				purchasedDate: new Date().toString(),
				expiryDate: new Date(
					new Date().getTime() + weekInMilliseconds
				).toString(),
			};

			await moveGroceryItemToFridge({
				groceryItemId: element.original.id,
				input: groceryItemInput,
			})
				.then(response => {
					if (!response.data?.moveGroceryItemToFridge.success) {
						success = false;
						alert('errors while moving items!');
					} else if (
						response.data?.moveGroceryItemToFridge.success &&
						success &&
						i == selectedRows.length - 1
					) {
						// upon successful creating a fridge
						alert('successful!');
						// reload to show the user the latest changes
						router.reload();
					}
				})
				.catch(error => {
					success = false;
					alert('error!' + error.toString());
				});
		}
	};

	const renderUserFridges = () => {
		if (!userFridges && fetchingFridges) return <Text>Loading...</Text>;
		if (!userFridges && !fetchingFridges)
			return <Text>Errors getting your list of fridges</Text>;

		// TODO: There are other errors even if its a successful fetch
		if (userFridges?.getUserFridges.fridges?.length === 0)
			return (
				<Box display={'flex'} flexDirection="row" alignItems="center">
					<Text>You have no fridges, create one{'\xa0'}</Text>
					<Text as="i">
						<Link href="/fridges/createFridge">here</Link>!
					</Text>
				</Box>
			);

		return (
			<Box display={'flex'} flexDirection="row" alignItems="center">
				<Select
					variant="filled"
					disabled={selectedRows.length == 0}
					onChange={(event: any) => {
						setSelectedFridge(event.target.selectedOptions[0].value);
					}}
				>
					{userFridges?.getUserFridges.fridges?.map((element, index) => {
						return (
							<option value={index} key={index} selected={index === 0}>
								{element.name}
							</option>
						);
					})}
				</Select>
			</Box>
		);
	};

	return (
		<Box>
			<Center>
				<Styles isDark={isDark} key={props.rerenderTime}>
					<Table
						columns={columns}
						data={data}
						setSelectedRows={setSelectedRows}
						key={props.rerenderTime}
					/>
				</Styles>
			</Center>
			<Center mt={8 / 2}>
				<Button
					mb={8 / 2}
					mr={8 / 2}
					colorScheme="teal"
					border="2px"
					onClick={() => {
						router.push({
							pathname: `/groceryLists/createGroceryItem`,
							query: { groceryListId: props.groceryListId },
						});
					}}
				>
					Add grocery list item
				</Button>
				<Button
					mb={8 / 2}
					mr={8 / 2}
					disabled={selectedRows.length != 1}
					variant="outline"
					colorScheme="orange"
					border="2px"
					onClick={() => {
						localStorage.setItem(
							'groceryItem',
							JSON.stringify(selectedRows[0].original)
						);
						router.push({
							pathname: `/groceryLists/editGroceryItem`,
							query: {
								groceryListId: props.groceryListId,
								itemId: selectedRows[0].original.id,
							},
						});
					}}
				>
					Edit Selected
				</Button>
				<Button
					mb={8 / 2}
					disabled={selectedRows.length == 0}
					variant="outline"
					colorScheme="red"
					border="2px"
					onClick={async () => {
						let success = true;
						for (let i = 0; i < selectedRows.length; i++) {
							let element = selectedRows[i];
							await deleteGroceryItem({ groceryItemId: element.original.id })
								.then(async response => {
									if (response.data?.deleteGroceryItem.errors) {
										success = false;
										alert(
											'errors encountered while deleting selected item(s)!'
										);
									}

									// ----------------
									// delete images from firebase
									// Create a reference to the file to delete
									getPathStorageFromUrl(element.original.img);
									const desertRef = ref(
										storage,
										getPathStorageFromUrl(element.original.img)
									);

									// Delete the file
									await deleteObject(desertRef)
										.then(() => {
											// File deleted successfully
										})
										.catch(error => {
											success = false;
											alert(
												'error!' +
													error.toString() +
													', please report to the developers'
											);
										});
									// ----------------

									// no errors && at the end of deletion
									if (
										!response.data?.deleteGroceryItem.errors &&
										response.data?.deleteGroceryItem.success &&
										success &&
										i == selectedRows.length - 1
									) {
										// upon successful creating a fridge
										alert('successful!');
										// reload to show the user the latest changes
										router.reload();
									}
								})
								.catch(error => {
									success = false;
									alert('error!' + error.toString());
								});
						}
					}}
				>
					Delete Selected
				</Button>
			</Center>
			<Center>
				<Button
					disabled={selectedRows.length == 0}
					variant="outline"
					colorScheme="blue"
					border="2px"
					onClick={() => {
						moveSelected();
					}}
				>
					Move Selected
				</Button>
				<Text ml={8 / 2} mr={8 / 2}>
					To
				</Text>
				{renderUserFridges()}
			</Center>
		</Box>
	);
};

export default GroceryItemTable;
